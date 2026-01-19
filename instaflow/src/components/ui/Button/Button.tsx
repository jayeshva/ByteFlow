import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../lib/cn';
import { Loader2 } from 'lucide-react';

/**
 * Button Component
 * A versatile button with multiple variants, sizes, and states
 */

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center gap-2 font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95',
  {
    variants: {
      variant: {
        primary:
          'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300',
        secondary:
          'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
        outline:
          'border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 focus:ring-gray-500',
        ghost:
          'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
        danger:
          'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-lg shadow-red-200',
        success:
          'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-lg shadow-green-200',
        gradient:
          'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 focus:ring-indigo-500 shadow-lg shadow-indigo-200',
        dark:
          'bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-700 shadow-lg shadow-gray-300',
      },
      size: {
        xs: 'text-xs px-2.5 py-1.5 rounded-lg',
        sm: 'text-sm px-3 py-2 rounded-xl',
        md: 'text-sm px-5 py-3 rounded-xl',
        lg: 'text-base px-6 py-4 rounded-2xl',
        xl: 'text-lg px-8 py-5 rounded-2xl',
        icon: 'p-2 rounded-xl',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
