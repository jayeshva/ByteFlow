import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../lib/cn';

/**
 * Badge Component
 * A small label for status indicators, counts, or categories
 */

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-bold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-700',
        primary: 'bg-indigo-100 text-indigo-700',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-amber-100 text-amber-700',
        danger: 'bg-red-100 text-red-700',
        info: 'bg-blue-100 text-blue-700',
        outline: 'border-2 border-gray-200 text-gray-700 bg-transparent',
        gradient: 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white',
      },
      size: {
        xs: 'text-[10px] px-1.5 py-0.5 rounded',
        sm: 'text-xs px-2 py-0.5 rounded-md',
        md: 'text-xs px-2.5 py-1 rounded-lg',
        lg: 'text-sm px-3 py-1.5 rounded-xl',
      },
      dot: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        dot: true,
        className: 'pl-1.5',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'sm',
      dot: false,
    },
  }
);

const dotColorMap: Record<string, string> = {
  default: 'bg-gray-500',
  primary: 'bg-indigo-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  outline: 'bg-gray-500',
  gradient: 'bg-white',
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({
  variant,
  size,
  dot,
  icon,
  className,
  children,
  ...props
}) => {
  return (
    <span className={cn(badgeVariants({ variant, size, dot }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full animate-pulse',
            dotColorMap[variant || 'default']
          )}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

export { Badge, badgeVariants };
