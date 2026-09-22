import { config } from '../config';
import type { StorageProvider } from './types';
import { LocalFilesystemStorage } from './local';
import { VercelBlobStorage } from './vercel-blob';
import { RailwayVolumeStorage } from './railway-volume';

let provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (provider) return provider;

  switch (config.storageProvider) {
    case 'vercel-blob':
      provider = new VercelBlobStorage();
      break;
    case 'railway-volume':
      provider = new RailwayVolumeStorage();
      break;
    case 'local':
    default:
      provider = new LocalFilesystemStorage();
      break;
  }

  return provider;
}
