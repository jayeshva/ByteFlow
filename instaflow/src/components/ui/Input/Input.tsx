import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../lib/cn';
import { AlertCircle } from 'lucide-react';

/**
 * Input Component
 * A styled input with label, helper text, error state, and icon support
 */

const inputVariants = cva(
  'w-full transition-all duration-200 outline-none font-medium text-gray-900 placeholder:text-gray-400',
  {
    variants: {
      variant: {
        default:
          'bg-gray-50/50 border border-gray-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100',
        filled:
          'bg-gray-100 border-2 border-transparent focus:border-indigo-500 focus:bg-white',
        outline:
          'bg-transparent border-2 border-gray-300 focus:border-indigo-500',
      },
      inputSize: {
        sm: 'text-sm px-3 py-2 rounded-lg',
        md: 'text-sm px-4 py-3 rounded-xl',
        lg: 'text-base px-5 py-4 rounded-2xl',
      },
      hasError: {
        true: 'border-red-500 focus:border-red-500 focus:ring-red-100',
        false: '',
      },
      hasIcon: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        hasIcon: true,
        inputSize: 'sm',
        className: 'pl-9',
      },
      {
        hasIcon: true,
        inputSize: 'md',
        className: 'pl-11',
      },
      {
        hasIcon: true,
        inputSize: 'lg',
        className: 'pl-14',
      },
    ],
    defaultVariants: {
      variant: 'default',
      inputSize: 'md',
      hasError: false,
      hasIcon: false,
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: React.ReactNode;
  containerClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      inputSize,
      label,
      helperText,
      error,
      icon,
      containerClassName,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
    const hasError = !!error;
    const hasIcon = !!icon;

    return (
      <div className={cn('space-y-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-gray-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div
              className={cn(
                'absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-colors',
                hasError && 'text-red-400'
              )}
            >
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              inputVariants({ variant, inputSize, hasError, hasIcon }),
              className
            )}
            {...props}
          />
        </div>
        {(helperText || error) && (
          <div
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium',
              error ? 'text-red-500' : 'text-gray-500'
            )}
          >
            {error && <AlertCircle className="w-3.5 h-3.5" />}
            <span>{error || helperText}</span>
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
