import type { PropsWithChildren, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type SectionHeadingProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  align?: 'left' | 'center';
}>;

export function SectionHeading({ eyebrow, title, description, align = 'left', children }: SectionHeadingProps) {
  return (
    <div
      className={cn('space-y-4', {
        'text-center': align === 'center',
        'mx-auto max-w-3xl': align === 'center',
      })}
    >
      {eyebrow ? <Badge className={cn({ 'mx-auto': align === 'center' })}>{eyebrow}</Badge> : null}
      <h2 className="text-3xl font-semibold text-slate-100 md:text-4xl">{title}</h2>
      {description ? <p className="text-slate-300">{description}</p> : null}
      {children}
    </div>
  );
}
