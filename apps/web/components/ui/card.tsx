import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

type DivProps = HTMLAttributes<HTMLDivElement>;

type HeadingProps = HTMLAttributes<HTMLHeadingElement>;

type ParagraphProps = HTMLAttributes<HTMLParagraphElement>;

export function Card({ className, ...props }: DivProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/10 backdrop-blur',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: DivProps) {
  return <div className={cn('space-y-2 border-b border-slate-800 pb-4', className)} {...props} />;
}

export function CardContent({ className, ...props }: DivProps) {
  return <div className={cn('space-y-4 pt-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HeadingProps) {
  return <h3 className={cn('text-xl font-semibold text-slate-100', className)} {...props} />;
}

export function CardDescription({ className, ...props }: ParagraphProps) {
  return <p className={cn('mt-2 text-sm text-slate-300', className)} {...props} />;
}
