import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id: propId, ...props }, ref) => {
    const autoId = useId();
    const id = propId || autoId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={
            error ? errorId : helperText ? helperId : undefined
          }
          className={cn(
            'w-full rounded-lg border bg-[var(--surface-base)] px-4 py-3 text-[var(--text-primary)] text-base',
            'placeholder:text-[var(--text-tertiary)]',
            'focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-subtle)]',
            'transition-colors duration-200',
            'disabled:bg-[var(--surface-subtle)] disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed',
            'min-h-[48px]',
            error
              ? 'border-[var(--error-500)] focus:border-[var(--error-600)] focus:ring-[var(--error-50)]'
              : 'border-[var(--border-default)]',
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-[var(--error-600)]">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-sm text-[var(--text-tertiary)]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';