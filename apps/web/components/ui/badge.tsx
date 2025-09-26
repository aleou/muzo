import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-violet-500/50 bg-violet-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-violet-200',
        className,
      )}
      {...props}
    />
  );
}
