import React from 'react';
import { cn } from '../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button visual style */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Full width button */
  fullWidth?: boolean;
  /** Show loading spinner */
  loading?: boolean;
  /** Icon element (left) */
  leftIcon?: React.ReactNode;
  /** Icon element (right) */
  rightIcon?: React.ReactNode;
}

/**
 * Button Component
 * 
 * Primary CTA action. Use sparingly — only one primary per view.
 * Secondary for supporting actions. Ghost for subtle interactions.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary: 'bg-accent text-white hover:bg-accent/90 active:scale-95',
      secondary: 'bg-background-elevated text-foreground-primary border border-border-default hover:bg-background-tertiary',
      ghost: 'text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary',
      danger: 'bg-error/10 text-error border border-error/20 hover:bg-error/20',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4',
      lg: 'h-12 px-6 text-lg',
    };

    return (
      <button
        ref={ref}
        role="button"
        aria-busy={loading}
        aria-disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
          'transition-all duration-normal',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          (disabled || loading) && 'opacity-50 cursor-not-allowed',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
