import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../lib/cn';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Toast Component
 * Notification toast with variants for success, error, warning, and info
 */

const toastVariants = cva(
  'flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-sm animate-in slide-in-from-top-5 fade-in duration-300',
  {
    variants: {
      variant: {
        success: 'bg-green-50/95 border-green-200 text-green-800',
        error: 'bg-red-50/95 border-red-200 text-red-800',
        warning: 'bg-amber-50/95 border-amber-200 text-amber-800',
        info: 'bg-blue-50/95 border-blue-200 text-blue-800',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
);

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const iconColorMap = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
};

export interface ToastProps extends VariantProps<typeof toastVariants> {
  id: string;
  title?: string;
  message: string;
  duration?: number;
  onDismiss?: (id: string) => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const Toast: React.FC<ToastProps> = ({
  id,
  variant = 'info',
  title,
  message,
  onDismiss,
  action,
}) => {
  const Icon = iconMap[variant || 'info'];

  return (
    <div className={cn(toastVariants({ variant }))}>
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', iconColorMap[variant || 'info'])} />
      <div className="flex-1 min-w-0">
        {title && (
          <p className="font-bold text-sm mb-0.5">{title}</p>
        )}
        <p className="text-sm font-medium opacity-90">{message}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="mt-2 text-xs font-bold uppercase tracking-wider hover:underline"
          >
            {action.label}
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={() => onDismiss(id)}
          className="shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export { Toast, toastVariants };
