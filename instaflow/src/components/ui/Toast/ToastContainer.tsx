import React from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Toast } from './Toast';
import type { RootState } from '../../../store/store';
import { removeToast } from '../../../store/slices/toastSlice';
import { cn } from '../../../lib/cn';

/**
 * ToastContainer Component
 * Renders all active toasts in a fixed position container
 */

const ToastContainer: React.FC = () => {
  const dispatch = useDispatch();
  const toasts = useSelector((state: RootState) => state.toast.toasts);

  const handleDismiss = (id: string) => {
    dispatch(removeToast(id));
  };

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div
      className={cn(
        'fixed top-4 right-4 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none'
      )}
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            id={toast.id}
            variant={toast.variant}
            title={toast.title}
            message={toast.message}
            onDismiss={handleDismiss}
            action={toast.action}
          />
        </div>
      ))}
    </div>,
    document.body
  );
};

export { ToastContainer };
