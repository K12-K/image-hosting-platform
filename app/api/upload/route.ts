import { NextRequest, NextResponse } from 'next/server';
import { config, MAX_TOTAL_UPLOAD_BYTES } from '@/lib/config';
import { validateFile, validateMagicBytes, getExtensionForMimeType } from '@/lib/validation';
import { getStorageProvider } from '@/lib/storage';
import { supabaseAdmin } from '@/lib/supabase-server';
import { checkRateLimit, recordUpload } from '@/lib/rate-limit';
import { getClientIP } from '@/lib/ip';
import { RETENTION_MS } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface UploadResponseItem {
  success: boolean;
  originalFilename: string;
  url?: string;
  id?: string;
  size?: number;
  mimeType?: string;
  expiresAt?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);

  const rateLimit = await checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: rateLimit.error },
      { status: 429 }
    );
  }

  const formData = await request.formData();
  const files = formData.getAll('files') as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  if (files.length > config.maxFilesPerUpload) {
    return NextResponse.json(
      { error: `Maximum ${config.maxFilesPerUpload} files per upload` },
      { status: 400 }
    );
  }

  let totalSize = 0;
  for (const file of files) {
    totalSize += file.size;
  }
  if (totalSize > MAX_TOTAL_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Total upload size exceeds ${config.maxTotalUploadMB}MB limit` },
      { status: 400 }
    );
  }

  const storage = getStorageProvider();
  const expiresAt = new Date(Date.now() + RETENTION_MS);
  const results: UploadResponseItem[] = [];

  for (const file of files) {
    const validation = validateFile(file);
    if (!validation.valid) {
      results.push({
        success: false,
        originalFilename: file.name,
        error: validation.error,
      });
      continue;
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());

      if (!validateMagicBytes(buffer, validation.mimeType!)) {
        results.push({
          success: false,
          originalFilename: file.name,
          error: 'File content does not match its declared type',
        });
        continue;
      }

      const ext = validation.extension || getExtensionForMimeType(validation.mimeType!);
      const uploadResult = await storage.upload(buffer, validation.mimeType!, ext);

      console.log(await supabaseAdmin.auth.getUser())

      const { data, error } = await supabaseAdmin
        .from('images')
        .insert({
          storage_key: uploadResult.storageKey,
          original_filename: file.name,
          mime_type: uploadResult.mimeType,
          size: uploadResult.size,
          uploaded_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          public_url: uploadResult.publicUrl,
          storage_provider: config.storageProvider,
        })
        .select('id')
        .single();

      if (error) {
        await storage.delete(uploadResult.storageKey);
        results.push({
          success: false,
          originalFilename: file.name,
          error: 'Failed to save image metadata',
        });
        continue;
      }

      results.push({
        success: true,
        originalFilename: file.name,
        url: uploadResult.publicUrl,
        id: data.id,
        size: uploadResult.size,
        mimeType: uploadResult.mimeType,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      results.push({
        success: false,
        originalFilename: file.name,
        error: message,
      });
    }
  }

  await recordUpload(ip);

  const successCount = results.filter((r) => r.success).length;
  if (successCount === 0) {
    return NextResponse.json({ error: 'All uploads failed', results }, { status: 400 });
  }

  return NextResponse.json({ results });
}
