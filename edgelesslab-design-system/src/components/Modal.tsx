import React, { useEffect } from 'react';
import { cn } from '../utils/cn';
import { Button } from './Button';

export interface ModalProps {
  /** Modal visibility */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Description text */
  description?: string;
  /** Modal content */
  children?: React.ReactNode;
  /** Footer actions */
  footer?: React.ReactNode;
  /** Max width */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Hide default close button */
  hideClose?: boolean;
  /** Click outside to close */
  closeOnOverlay?: boolean;
}

/**
 * Modal Component
 *
 * Overlay dialog. Centered with backdrop blur.
 * Use for confirmations, forms, detail views.
 */
export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      open,
      onClose,
      title,
      description,
      children,
      footer,
      size = 'md',
      hideClose = false,
      closeOnOverlay = true,
    },
    ref
  ) => {
    const sizes = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
    };

    // Lock body scroll when open
    useEffect(() => {
      if (open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
      return () => {
        document.body.style.overflow = '';
      };
    }, [open]);

    // Escape key to close
    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && open) onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [open, onClose]);

    if (!open) return null;

    return (
      <div
        ref={ref}
        className="fixed inset-0 z-modal flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-desc' : undefined}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-background-primary/80 backdrop-blur-sm transition-opacity duration-normal"
          onClick={closeOnOverlay ? onClose : undefined}
          aria-hidden="true"
        />

        {/* Content */}
        <div
          className={cn(
            'relative bg-background-elevated border border-border-default rounded-xl shadow-xl',
            'w-full animate-scale-in',
            sizes[size]
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6">
            <div className="flex-1">
              {title && (
                <h2
                  id="modal-title"
                  className="text-lg font-semibold text-foreground-primary"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-desc" className="mt-1 text-sm text-foreground-secondary">
                  {description}
                </p>
              )}
            </div>
            {!hideClose && (
              <button
                onClick={onClose}
                className="ml-4 text-foreground-quaternary hover:text-foreground-secondary transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-4">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  }
);

// Convenience footer builders
export const ModalFooter = {
  Confirm: ({ onCancel, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }: {
    onCancel: () => void;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
  }) => (
    <>
      <Button variant="ghost" onClick={onCancel}>
        {cancelText}
      </Button>
      <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
        {confirmText}
      </Button>
    </>
  ),
};

Modal.displayName = 'Modal';

export default Modal;
