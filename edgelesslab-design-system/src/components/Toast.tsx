import React, { useEffect } from 'react';
import { cn } from '../utils/cn';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'accent';

export interface ToastProps {
  /** Toast message */
  message: string;
  /** Visual style */
  variant?: ToastVariant;
  /** Auto-dismiss duration (ms). 0 = no auto-dismiss */
  duration?: number;
  /** Dismiss handler */
  onDismiss?: () => void;
  /** Optional description */
  description?: string;
  /** Action button */
  action?: { label: string; onClick: () => void };
}

/**
 * Toast Component
 *
 * Notification system. Slides in from bottom-right with auto-dismiss.
 * Use for feedback, confirmations, errors.
 */
export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      message,
      variant = 'accent',
      duration = 4000,
      onDismiss,
      description,
      action,
    },
    ref
  ) => {
    useEffect(() => {
      if (duration > 0 && onDismiss) {
        const timer = setTimeout(onDismiss, duration);
        return () => clearTimeout(timer);
      }
    }, [duration, onDismiss]);

    const variants: Record<ToastVariant, string> = {
      success:
        'border-success/20 bg-success/10 text-success',
      error:
        'border-error/20 bg-error/10 text-error',
      warning:
        'border-warning/20 bg-warning/10 text-warning',
      info:
        'border-info/20 bg-info/10 text-info',
      accent:
        'border-accent/20 bg-accent/10 text-accent',
    };

    const iconPaths: Record<ToastVariant, string> = {
      success: 'M5 13l4 4L19 7',
      error: 'M6 18L18 6M6 6l12 12',
      warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
      info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      accent: 'M13 10V3L4 14h7v7l9-11h-7z',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm',
          'animate-slide-up shadow-lg',
          'bg-background-secondary/90',
          'transition-all duration-normal',
          variants[variant]
        )}
        role="alert"
        aria-live="polite"
        tabIndex={-1}
      >
        <svg
          className="w-5 h-5 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[variant]} />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground-primary">{message}</p>
          {description && (
            <p className="mt-0.5 text-sm text-foreground-secondary">{description}</p>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-sm font-medium hover:underline"
              aria-label={action.label}
            >
              {action.label}
            </button>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 text-foreground-quaternary hover:text-foreground-secondary transition-colors"
            aria-label="Dismiss notification"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

// Toast container for positioning
export interface ToastContainerProps {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  children,
  position = 'bottom-right',
}) => {
  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div
      className={cn(
        'fixed z-toast flex flex-col gap-2 pointer-events-none',
        positions[position]
      )}
    >
      {React.Children.map(children, (child) => (
        <div className="pointer-events-auto">{child}</div>
      ))}
    </div>
  );
};

Toast.displayName = 'Toast';
ToastContainer.displayName = 'ToastContainer';

export default Toast;
