import { randomBytes } from 'crypto';
import { put, del } from '@vercel/blob';
import { config } from '../config';
import type { StorageProvider, UploadResult } from './types';

export class VercelBlobStorage implements StorageProvider {
  private generateKey(extension: string): string {
    const id = randomBytes(16).toString('hex');
    return `uploads/${id}${extension}`;
  }

  async upload(file: File | Buffer, mimeType: string, extension: string): Promise<UploadResult> {
    const storageKey = this.generateKey(extension);

    let body: Buffer | File;
    if (file instanceof Buffer) {
      body = file;
    } else {
      body = file;
    }

    const blob = await put(storageKey, body, {
      access: 'public',
      contentType: mimeType,
      addRandomSuffix: false,
    });

    return {
      storageKey,
      publicUrl: blob.url,
      size: file instanceof Buffer ? file.length : file.size,
      mimeType,
    };
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await del(storageKey);
    } catch {
      // ignore errors for already-deleted blobs
    }
  }

  async deleteExpired(expiredKeys: string[]): Promise<number> {
    let deleted = 0;
    if (expiredKeys.length === 0) return 0;
    try {
      await del(expiredKeys);
      deleted = expiredKeys.length;
    } catch {
      // try individual
      for (const key of expiredKeys) {
        try {
          await del(key);
          deleted++;
        } catch {
          // ignore
        }
      }
    }
    return deleted;
  }
}
