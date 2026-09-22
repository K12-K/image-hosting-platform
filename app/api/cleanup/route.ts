import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getStorageProvider } from '@/lib/storage';
import { cleanupOldRateLimits } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date().toISOString();

    const { data: expiredImages, error } = await supabaseAdmin
      .from('images')
      .select('id, storage_key')
      .lt('expires_at', now);

    if (error) {
      return NextResponse.json({ error: 'Failed to query expired images' }, { status: 500 });
    }

    if (!expiredImages || expiredImages.length === 0) {
      const rateLimitDeleted = await cleanupOldRateLimits();
      return NextResponse.json({
        deleted: 0,
        rateLimitEntriesDeleted: rateLimitDeleted,
      });
    }

    const storage = getStorageProvider();
    const storageKeys = expiredImages.map((img) => img.storage_key);
    const storageDeleted = await storage.deleteExpired(storageKeys);

    const { error: deleteError } = await supabaseAdmin
      .from('images')
      .delete()
      .in(
        'id',
        expiredImages.map((img) => img.id)
      );

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete expired image records' },
        { status: 500 }
      );
    }

    const rateLimitDeleted = await cleanupOldRateLimits();

    return NextResponse.json({
      deleted: expiredImages.length,
      storageDeleted,
      rateLimitEntriesDeleted: rateLimitDeleted,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cleanup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
