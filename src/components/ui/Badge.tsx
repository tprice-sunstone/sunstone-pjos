import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'default' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--surface-subtle)] text-[var(--text-secondary)]',
  secondary: 'bg-[var(--surface-raised)] text-[var(--text-secondary)] ring-1 ring-[var(--border-default)]',
  accent:
    'bg-[var(--accent-subtle)] text-[var(--accent-600,var(--accent-hover))] ring-1 ring-[var(--accent-200,#fbd9c6)]',
  success: 'bg-[var(--success-50)] text-[var(--success-600)] ring-1 ring-emerald-200',
  warning: 'bg-[var(--warning-50)] text-[var(--warning-600)] ring-1 ring-amber-200',
  error: 'bg-[var(--error-50)] text-[var(--error-600)] ring-1 ring-red-200',
  info: 'bg-[var(--info-50)] text-[var(--info-600)] ring-1 ring-blue-200',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({
  variant = 'default',
  size = 'md',
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  );
}