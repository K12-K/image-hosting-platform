'use client';

import { useCallback, useRef, useState } from 'react';
import { UploadCloud, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  uploading: boolean;
  maxFiles: number;
  maxFileSizeMB: number;
}

export function UploadZone({ onFilesSelected, uploading, maxFiles, maxFileSizeMB }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
      );
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected]
  );

  const handleFilePicker = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onFilesSelected(files);
      }
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [onFilesSelected]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-300',
        isDragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 scale-[1.01]'
          : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-900/50',
        uploading && 'opacity-60 pointer-events-none'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleFilePicker}
      />

      <div
        className={cn(
          'mb-4 flex h-16 w-16 items-center justify-center rounded-full transition-colors',
          isDragging
            ? 'bg-blue-500 text-white'
            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
        )}
      >
        <UploadCloud className="h-8 w-8" />
      </div>

      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Drop product images here
      </h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        or{' '}
        <button
          onClick={() => inputRef.current?.click()}
          className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
        >
          choose files
        </button>
      </p>
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
        Upload multiple images at once &middot; JPG, PNG, WEBP, GIF &middot; Max {maxFileSizeMB}MB per image &middot; Up to {maxFiles} files
      </p>

      <Button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="mt-6"
        size="lg"
      >
        <ImagePlus className="mr-2 h-5 w-5" />
        Upload Images
      </Button>
    </div>
  );
}
