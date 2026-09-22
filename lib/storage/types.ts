export interface UploadResult {
  storageKey: string;
  publicUrl: string;
  size: number;
  mimeType: string;
}

export interface StoredFile {
  storageKey: string;
  publicUrl: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface StorageProvider {
  upload(file: File | Buffer, mimeType: string, extension: string): Promise<UploadResult>;
  delete(storageKey: string): Promise<void>;
  deleteExpired(expiredKeys: string[]): Promise<number>;
}
