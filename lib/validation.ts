import path from 'path';
import { config, MAX_FILE_SIZE_BYTES } from './config';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  extension?: string;
  mimeType?: string;
}

export function validateFile(file: { name: string; type: string; size: number }): ValidationResult {
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File exceeds ${config.maxFileSizeMB}MB limit` };
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!config.allowedExtensions.includes(ext)) {
    return { valid: false, error: `File type ${ext} is not allowed` };
  }

  if (!config.allowedMimeTypes.includes(file.type)) {
    return { valid: false, error: `MIME type ${file.type || 'unknown'} is not allowed` };
  }

  return { valid: true, extension: ext, mimeType: file.type };
}

const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};

export function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const expected = MAGIC_BYTES[mimeType];
  if (!expected) return true;
  if (buffer.length < expected.length) return false;
  return expected.every((byte, i) => buffer[i] === byte);
}

export function getExtensionForMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };
  return map[mimeType] || '.jpg';
}
