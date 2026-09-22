'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink, Trash2, Star, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatBytes, formatTimeRemaining, formatTimestamp } from '@/lib/format';
import type { ImageRecord } from '@/lib/types';

interface ImageCardProps {
  image: ImageRecord;
  index: number;
  selected: boolean;
  onSelectChange: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
  onPreview: (index: number) => void;
}

export function ImageCard({ image, index, selected, onSelectChange, onDelete, onPreview }: ImageCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(image.public_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = image.public_url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isFirst = index === 0;

  return (
    <div
      className={cn(
        'group relative flex flex-col sm:flex-row gap-4 rounded-xl border bg-card p-4 transition-all hover:shadow-md',
        selected && 'ring-2 ring-blue-500',
        isFirst && 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-950/20'
      )}
    >
      {/* Index number */}
      <div className="absolute -left-2 -top-2 z-10">
        <div
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-sm',
            isFirst
              ? 'bg-blue-500 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
          )}
        >
          {index + 1}
        </div>
      </div>

      {/* Checkbox */}
      <div className="absolute right-3 top-3 z-10">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelectChange(image.id, checked === true)}
        />
      </div>

      {/* Thumbnail */}
      <div
        className="flex-shrink-0 cursor-pointer self-start sm:mt-0 mt-0"
        onClick={() => onPreview(index)}
      >
        <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.public_url}
            alt={image.original_filename}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 pr-8">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {isFirst && (
            <Badge variant="default" className="bg-blue-500 hover:bg-blue-500 gap-1">
              <Star className="h-3 w-3" />
              Main Image
            </Badge>
          )}
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-full">
            {image.original_filename}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <code className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded truncate max-w-full block">
            {image.public_url}
          </code>
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400 dark:text-slate-500">
          <span>{formatBytes(image.size)}</span>
          <span>&middot;</span>
          <span>{formatTimestamp(image.uploaded_at)}</span>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimeRemaining(image.expires_at)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            variant={copied ? 'secondary' : 'default'}
            onClick={handleCopy}
            className="h-8"
          >
            {copied ? (
              <>
                <Check className="mr-1 h-3.5 w-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1 h-3.5 w-3.5" />
                Copy URL
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(image.public_url, '_blank')}
            className="h-8"
          >
            <ExternalLink className="mr-1 h-3.5 w-3.5" />
            Open
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(image.id)}
            className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
