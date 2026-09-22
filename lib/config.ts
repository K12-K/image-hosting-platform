import path from 'path';

function envNumber(key: string, fallback: number): number {
  const v = process.env[key];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config = {
  maxFileSizeMB: envNumber('MAX_FILE_SIZE_MB', 10),
  maxFilesPerUpload: envNumber('MAX_FILES_PER_UPLOAD', 50),
  maxTotalUploadMB: envNumber('MAX_TOTAL_UPLOAD_MB', 100),
  retentionDays: envNumber('RETENTION_DAYS', 2),
  rateLimitWindowMinutes: envNumber('RATE_LIMIT_WINDOW_MINUTES', 10),
  rateLimitMaxRequests: envNumber('RATE_LIMIT_MAX_REQUESTS', 30),
  dailyUploadLimit: envNumber('DAILY_UPLOAD_LIMIT', 200),
  storageProvider: (process.env.STORAGE_PROVIDER || 'local') as 'local' | 'vercel-blob' | 'railway-volume',
  localUploadDir: process.env.LOCAL_UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads'),
  railwayVolumePath: process.env.RAILWAY_VOLUME_PATH || '/data/uploads',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:3000',
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as string[],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as string[],
};

export const MAX_FILE_SIZE_BYTES = config.maxFileSizeMB * 1024 * 1024;
export const MAX_TOTAL_UPLOAD_BYTES = config.maxTotalUploadMB * 1024 * 1024;
export const RETENTION_MS = config.retentionDays * 24 * 60 * 60 * 1000;
