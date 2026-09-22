'use client';

import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Copy, Check, ExternalLink } from 'lucide-react';
import type { ImageRecord } from '@/lib/types';

interface LightboxProps {
  images: ImageRecord[];
  open: boolean;
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export function Lightbox({ images, open, index, onClose, onIndexChange }: LightboxProps) {
  const [copied, setCopied] = useState(false);

  const current = images[index];

  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + images.length) % images.length);
  }, [index, images.length, onIndexChange]);

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % images.length);
  }, [index, images.length, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, goPrev, goNext, onClose]);

  const handleCopy = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.public_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">{current.original_filename}</DialogTitle>
        <div className="relative flex items-center justify-center bg-black/95 min-h-[300px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.public_url}
            alt={current.original_filename}
            className="max-h-[70vh] max-w-full object-contain"
          />

          {images.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{current.original_filename}</span>
            <span className="text-xs text-muted-foreground">
              {index + 1} / {images.length}
            </span>
          </div>
          <code className="block text-xs text-muted-foreground bg-muted px-3 py-2 rounded truncate">
            {current.public_url}
          </code>
          <div className="flex gap-2">
            <Button size="sm" variant={copied ? 'secondary' : 'default'} onClick={handleCopy}>
              {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy URL'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(current.public_url, '_blank')}
            >
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Open Original
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
