import React from 'react';
import { cn } from '../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Badge color style */
  variant?: 'accent' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  /** Badge size */
  size?: 'sm' | 'md';
  /** Accessible label for screen readers */
  'aria-label'?: string;
}

/**
 * Badge Component
 * 
 * Small status indicator. Use for categories, status states, counts.
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', size = 'md', className, children, ...props }, ref) => {
    const variants = {
      accent: 'bg-accent/10 text-accent border border-accent/20',
      success: 'bg-success/10 text-success border border-success/20',
      warning: 'bg-warning/10 text-warning border border-warning/20',
      error: 'bg-error/10 text-error border border-error/20',
      info: 'bg-info/10 text-info border border-info/20',
      neutral: 'bg-background-tertiary text-foreground-tertiary border border-border-default',
    };

    const sizes = {
      sm: 'text-xs px-2 py-0.5',
      md: 'text-xs px-2.5 py-1',
    };

    return (
      <span
        ref={ref}
        role="status"
        aria-label={props['aria-label'] || (typeof children === 'string' ? children : 'badge')}
        tabIndex={-1}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-medium',
          'transition-all duration-fast hover:opacity-80',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
