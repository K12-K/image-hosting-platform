export interface ImageRecord {
  id: string;
  storage_key: string;
  original_filename: string;
  mime_type: string;
  size: number;
  uploaded_at: string;
  expires_at: string;
  public_url: string;
  storage_provider: string;
}

export interface UploadResultItem {
  success: boolean;
  originalFilename: string;
  url?: string;
  id?: string;
  size?: number;
  mimeType?: string;
  expiresAt?: string;
  error?: string;
}
