'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Copy, Trash2, UploadCloud, Loader2, AlertCircle, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { UploadZone } from '@/components/upload-zone';
import { ImageCard } from '@/components/image-card';
import { StatsBar } from '@/components/stats-bar';
import { Lightbox } from '@/components/lightbox';
import type { ImageRecord, UploadResultItem } from '@/lib/types';
import { formatBytes } from '@/lib/format';

const MAX_CONCURRENT = 3;

interface UploadingFile {
  name: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

export default function HomePage() {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadingFile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copyAllCopied, setCopyAllCopied] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch('/api/images');
      if (res.ok) {
        const data = await res.json();
        setImages(data.images || []);
      }
    } catch {
      // silent fail on initial load
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      setUploading(true);

      const queue: UploadingFile[] = files.map((f) => ({
        name: f.name,
        progress: 0,
        status: 'uploading' as const,
      }));
      setUploadQueue(queue);

      const uploadSingleBatch = async (batch: File[], batchIndices: number[]) => {
        const formData = new FormData();
        for (const file of batch) {
          formData.append('files', file);
        }

        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();

          if (!res.ok) {
            const errorMsg = data.error || 'Upload failed';
            for (const idx of batchIndices) {
              setUploadQueue((prev) => {
                const next = [...prev];
                next[idx] = { ...next[idx], status: 'error', error: errorMsg };
                return next;
              });
            }
            toast.error(errorMsg);
            return;
          }

          const results: UploadResultItem[] = data.results || [];
          for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const queueIdx = batchIndices[i];
            if (result.success) {
              setUploadQueue((prev) => {
                const next = [...prev];
                next[queueIdx] = { ...next[queueIdx], status: 'done', progress: 100 };
                return next;
              });
            } else {
              setUploadQueue((prev) => {
                const next = [...prev];
                next[queueIdx] = {
                  ...next[queueIdx],
                  status: 'error',
                  error: result.error || 'Upload failed',
                };
                return next;
              });
              toast.error(`${result.originalFilename}: ${result.error}`);
            }
          }

          await fetchImages();
        } catch {
          for (const idx of batchIndices) {
            setUploadQueue((prev) => {
              const next = [...prev];
              next[idx] = { ...next[idx], status: 'error', error: 'Network error' };
              return next;
            });
          }
          toast.error('Network error during upload');
        }
      };

      const batches: File[] = [];
      const batchIndices: number[] = [];
      for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
        batches.push(...files.slice(i, i + MAX_CONCURRENT));
        batchIndices.push(...Array.from({ length: Math.min(MAX_CONCURRENT, files.length - i) }, (_, j) => i + j));
      }

      // Upload in chunks of MAX_CONCURRENT
      for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
        const batch = files.slice(i, i + MAX_CONCURRENT);
        const indices = Array.from({ length: batch.length }, (_, j) => i + j);
        await uploadSingleBatch(batch, indices);
      }

      setUploading(false);
      setUploadQueue([]);

      const successCount = files.length;
      toast.success(`${successCount} image${successCount > 1 ? 's' : ''} uploaded`);
    },
    [fetchImages]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const prevImages = images;
      setImages((prev) => prev.filter((img) => img.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      try {
        await fetch('/api/images/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [id] }),
        });
        toast.success('Image deleted');
      } catch {
        setImages(prevImages);
        toast.error('Failed to delete image');
      }
    },
    [images]
  );

  const handleDeleteSelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const prevImages = images;
    setImages((prev) => prev.filter((img) => !selectedIds.has(img.id)));
    setSelectedIds(new Set());

    try {
      await fetch('/api/images/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      toast.success(`${ids.length} image${ids.length > 1 ? 's' : ''} deleted`);
    } catch {
      setImages(prevImages);
      toast.error('Failed to delete images');
    }
  }, [images, selectedIds]);

  const handleDeleteAll = useCallback(async () => {
    const ids = images.map((img) => img.id);
    if (ids.length === 0) return;

    setImages([]);
    setSelectedIds(new Set());

    try {
      await fetch('/api/images/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      toast.success('All images deleted');
    } catch {
      await fetchImages();
      toast.error('Failed to delete all images');
    }
  }, [images, fetchImages]);

  const handleCopyAll = useCallback(async () => {
    if (images.length === 0) return;
    const urls = images.map((img) => img.public_url).join('\n');
    try {
      await navigator.clipboard.writeText(urls);
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
      toast.success(`Copied ${images.length} URLs to clipboard`);
    } catch {
      toast.error('Failed to copy URLs');
    }
  }, [images]);

  const handleSelectChange = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === images.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map((img) => img.id)));
    }
  }, [images, selectedIds]);

  const handlePreview = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  // Drag-and-drop reordering
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    setImages((prev) => {
      const next = [...prev];
      const draggedItem = next[dragItem.current!];
      next.splice(dragItem.current!, 1);
      next.splice(dragOverItem.current!, 0, draggedItem);
      return next;
    });

    dragItem.current = null;
    dragOverItem.current = null;
  };

  const totalSize = images.reduce((sum, img) => sum + img.size, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  PixHost
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Temporary image hosting for product listings
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyAll}
                disabled={images.length === 0}
              >
                {allCopied ? (
                  <>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy All URLs
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* Upload Zone */}
        <UploadZone
          onFilesSelected={handleFilesSelected}
          uploading={uploading}
          maxFiles={50}
          maxFileSizeMB={10}
        />

        {/* Upload Progress */}
        {uploadQueue.length > 0 && (
          <div className="space-y-2">
            {uploadQueue.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border bg-card p-3"
              >
                {item.status === 'uploading' && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                )}
                {item.status === 'done' && (
                  <div className="h-4 w-4 rounded-full bg-green-500" />
                )}
                {item.status === 'error' && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm flex-1 truncate">{item.name}</span>
                {item.status === 'uploading' && (
                  <div className="w-24">
                    <Progress value={50} className="h-1.5" />
                  </div>
                )}
                {item.status === 'error' && (
                  <span className="text-xs text-red-500">{item.error}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {images.length > 0 && <StatsBar images={images} />}

        {/* Bulk Actions */}
        {images.length > 0 && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                {selectedIds.size === images.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete Selected ({selectedIds.size})
              </Button>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600">
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all images?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {images.length} images ({formatBytes(totalSize)}). This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAll}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Image List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : images.length === 0 && !uploading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ImageOff className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No images uploaded yet. Drop images above to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {images.map((image, index) => (
              <div
                key={image.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className="cursor-grab active:cursor-grabbing"
              >
                <ImageCard
                  image={image}
                  index={index}
                  selected={selectedIds.has(image.id)}
                  onSelectChange={handleSelectChange}
                  onDelete={handleDelete}
                  onPreview={handlePreview}
                />
              </div>
            ))}
          </div>
        )}

        {/* Footer info */}
        <footer className="pt-8 pb-4 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-600">
            Images are automatically deleted after 2 days. No account required.
          </p>
        </footer>
      </main>

      {/* Lightbox */}
      <Lightbox
        images={images}
        open={lightboxOpen}
        index={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
