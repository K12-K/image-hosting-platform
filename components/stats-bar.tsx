'use client';

import { Images, HardDrive, Clock } from 'lucide-react';
import { formatBytes, formatTimeRemaining } from '@/lib/format';
import type { ImageRecord } from '@/lib/types';

interface StatsBarProps {
  images: ImageRecord[];
}

export function StatsBar({ images }: StatsBarProps) {
  const totalSize = images.reduce((sum, img) => sum + img.size, 0);
  const oldestExpiry = images.reduce<string | null>((oldest, img) => {
    if (!oldest || img.expires_at < oldest) return img.expires_at;
    return oldest;
  }, null);

  const stats = [
    {
      label: 'Images',
      value: `${images.length}`,
      icon: Images,
    },
    {
      label: 'Total Size',
      value: formatBytes(totalSize),
      icon: HardDrive,
    },
    {
      label: 'Oldest Expires',
      value: oldestExpiry ? formatTimeRemaining(oldestExpiry) : '--',
      icon: Clock,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 rounded-xl border bg-card p-3 sm:p-4"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex-shrink-0">
            <stat.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {stat.value}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {stat.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
