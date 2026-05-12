import React from 'react';
import { cn } from '../utils/cn';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Select size */
  size?: 'sm' | 'md' | 'lg';
  /** Error state */
  error?: boolean;
  /** Helper text */
  helperText?: string;
  /** Label text */
  label?: string;
  /** Full width */
  fullWidth?: boolean;
  /** Options data */
  options: { value: string; label: string; disabled?: boolean }[];
  /** Placeholder option (unselectable first option) */
  placeholder?: string;
}

/**
 * Select Component
 *
 * Dropdown selection. Matches Input styling for visual consistency.
 * Use for forms, filters, configuration.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      size = 'md',
      error = false,
      helperText,
      label,
      fullWidth = false,
      options,
      placeholder,
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
          <select
            ref={ref}
            className={cn(
              'bg-background-secondary border rounded-lg text-foreground-primary',
              'appearance-none',
              'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
              'transition-all duration-normal',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-error focus:border-error focus:ring-error',
              !error && 'border-border-default hover:border-border-strong',
              sizes[size],
              fullWidth && 'w-full',
              className
            )}
            disabled={disabled}
            aria-invalid={error}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* Chevron icon */}
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-quaternary pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
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

Select.displayName = 'Select';

export default Select;
