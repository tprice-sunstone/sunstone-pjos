import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent-primary)] text-[var(--text-on-accent)] border-transparent hover:bg-[var(--accent-hover)] shadow-sm',
  secondary:
    'bg-[var(--surface-base)] text-[var(--text-primary)] border-[var(--border-default)] hover:bg-[var(--surface-raised)] hover:border-[var(--border-strong)]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] border-transparent hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]',
  danger:
    'bg-[var(--error-50)] text-[var(--error-600)] border-[var(--error-50)] hover:bg-red-100 hover:border-red-200',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px] rounded-lg',
  md: 'px-6 py-3 text-sm min-h-[48px] rounded-lg',
  lg: 'px-8 py-4 text-base min-h-[56px] rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold border transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-[var(--accent-subtle)] focus:ring-offset-2',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';