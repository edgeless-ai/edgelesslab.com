import React from 'react';
import { cn } from '../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Remove padding for custom layouts */
  noPadding?: boolean;
  /** Add hover lift effect */
  hover?: boolean;
  /** Card border style */
  border?: 'default' | 'subtle' | 'none';
  /** Accessible label for screen readers */
  'aria-label'?: string;
}

/**
 * Card Component
 * 
 * Container for content grouping. Consistent padding, border, radius.
 * Use for feature cards, settings panels, content blocks.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ noPadding = false, hover = false, border = 'default', className, children, ...props }, ref) => {
    const borders = {
      default: 'border-border-default',
      subtle: 'border-border-subtle',
      none: 'border-transparent',
    };

    return (
      <div
        ref={ref}
        role="region"
        aria-label={props['aria-label'] || 'Card'}
        tabIndex={-1}
        className={cn(
          'bg-background-elevated border rounded-xl',
          'transition-all duration-normal',
          borders[border],
          border !== 'none' && 'border',
          !noPadding && 'px-6 py-6',
          hover && 'hover:-translate-y-1 hover:shadow-lg hover:border-border-strong',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
