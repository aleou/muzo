import { cn } from '@/lib/utils';
import type { LabelHTMLAttributes } from 'react';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('text-sm font-medium text-slate-200', className)} {...props} />
  );
}
