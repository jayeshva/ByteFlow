import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../lib/cn';

/**
 * Card Component
 * A flexible card container with variants and optional header/footer
 */

const cardVariants = cva(
  'rounded-2xl transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-white border border-gray-100 shadow-sm',
        elevated: 'bg-white shadow-xl shadow-gray-200/50',
        outlined: 'bg-white border-2 border-gray-200',
        ghost: 'bg-gray-50/50',
        gradient: 'bg-gradient-to-br from-white to-gray-50 border border-gray-100 shadow-lg',
        dark: 'bg-gray-900 text-white border border-gray-800',
      },
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
      hover: {
        none: '',
        lift: 'hover:shadow-xl hover:-translate-y-1 cursor-pointer',
        glow: 'hover:shadow-xl hover:shadow-indigo-100 cursor-pointer',
        border: 'hover:border-indigo-300 cursor-pointer',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      hover: 'none',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, hover, header, footer, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding: header || footer ? 'none' : padding, hover }), className)}
        {...props}
      >
        {header && (
          <div className="px-6 py-4 border-b border-gray-100">
            {header}
          </div>
        )}
        <div className={cn(header || footer ? 'p-6' : '')}>
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card sub-components
const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('flex items-center justify-between', className)} {...props}>
    {children}
  </div>
);

const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3 className={cn('text-lg font-bold text-gray-900', className)} {...props}>
    {children}
  </h3>
);

const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={cn('text-sm text-gray-500', className)} {...props}>
    {children}
  </p>
);

export { Card, CardHeader, CardTitle, CardDescription, cardVariants };
