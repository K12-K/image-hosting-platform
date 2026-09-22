import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getStorageProvider } from '@/lib/storage';

export const runtime = 'nodejs';

export async function DELETE(request: NextRequest) {
  const { ids } = await request.json().catch(() => ({ ids: [] as string[] }));

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No image IDs provided' }, { status: 400 });
  }

  const { data: images, error } = await supabaseAdmin
    .from('images')
    .select('id, storage_key')
    .in('id', ids);

  if (error) {
    return NextResponse.json({ error: 'Failed to find images' }, { status: 500 });
  }

  if (!images || images.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  const storage = getStorageProvider();

  for (const img of images) {
    try {
      await storage.delete(img.storage_key);
    } catch {
      // continue even if storage delete fails
    }
  }

  const { error: deleteError } = await supabaseAdmin
    .from('images')
    .delete()
    .in(
      'id',
      images.map((i) => i.id)
    );

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete image records' }, { status: 500 });
  }

  return NextResponse.json({ deleted: images.length });
}
