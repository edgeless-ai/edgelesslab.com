import React from 'react';
import { cn } from '../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Input size */
  size?: 'sm' | 'md' | 'lg';
  /** Error state */
  error?: boolean;
  /** Helper text shown below input */
  helperText?: string;
  /** Label text */
  label?: string;
  /** Left icon element */
  leftIcon?: React.ReactNode;
  /** Right icon element */
  rightIcon?: React.ReactNode;
  /** Full width */
  fullWidth?: boolean;
}

/**
 * Input Component
 *
 * Text entry with focus states. Deep void aesthetic with accent focus ring.
 * Use for forms, search, settings.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      error = false,
      helperText,
      label,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4',
      lg: 'h-12 px-4 text-lg',
    };

    return (
      <div className={cn(fullWidth && 'w-full')}>
        {label && (
          <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-quaternary">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              'bg-background-secondary border rounded-lg text-foreground-primary',
              'placeholder:text-foreground-quaternary',
              'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
              'transition-all duration-normal',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-error focus:border-error focus:ring-error',
              !error && 'border-border-default hover:border-border-strong',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              sizes[size],
              fullWidth && 'w-full',
              className
            )}
            disabled={disabled}
            aria-invalid={error}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-quaternary">
              {rightIcon}
            </span>
          )}
        </div>
        {helperText && (
          <p
            className={cn(
              'mt-1.5 text-sm',
              error ? 'text-error' : 'text-foreground-tertiary'
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
