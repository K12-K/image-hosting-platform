import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { config } from '../config';
import type { StorageProvider, UploadResult } from './types';

export class LocalFilesystemStorage implements StorageProvider {
  private uploadDir: string;

  constructor(uploadDir?: string) {
    this.uploadDir = uploadDir || config.localUploadDir;
    console.log(this.uploadDir, "12.....")
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  private generateKey(extension: string): string {
    const id = randomBytes(16).toString('hex');
    return `${id}${extension}`;
  }

  async upload(file: File | Buffer, mimeType: string, extension: string): Promise<UploadResult> {
    await this.ensureDir();
    const storageKey = this.generateKey(extension);
    const filePath = path.join(this.uploadDir, storageKey);

    if (file instanceof Buffer) {
      await fs.writeFile(filePath, file);
    } else {
      const arrayBuffer = await file.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(arrayBuffer));
    }

    const stat = await fs.stat(filePath);
    const publicUrl = `${config.publicBaseUrl}/uploads/${storageKey}`;

    return {
      storageKey,
      publicUrl,
      size: stat.size,
      mimeType,
    };
  }

  async delete(storageKey: string): Promise<void> {
    const filePath = path.join(this.uploadDir, storageKey);
    try {
      await fs.unlink(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  async deleteExpired(expiredKeys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of expiredKeys) {
      try {
        await this.delete(key);
        deleted++;
      } catch {
        // ignore individual errors
      }
    }
    return deleted;
  }
}
