import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, DetailedHTMLProps, PropsWithChildren } from 'react';

const baseStyle =
  'inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-60';

const variants = {
  primary: 'bg-violet-500 hover:bg-violet-400 text-white shadow-lg shadow-violet-500/30',
  secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700/70',
  ghost: 'bg-transparent hover:bg-slate-800 text-slate-200',
};

type ButtonVariant = keyof typeof variants;

type NativeButtonProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
>;

type ButtonProps = PropsWithChildren<NativeButtonProps> & {
  variant?: ButtonVariant;
  href?: string;
};

export function Button({
  variant = 'primary',
  className,
  children,
  href,
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = cn(baseStyle, variants[variant], className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  );
}
