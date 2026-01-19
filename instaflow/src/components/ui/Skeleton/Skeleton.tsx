import React from 'react';
import { cn } from '../../../lib/cn';

/**
 * Skeleton Component
 * Loading placeholder with shimmer animation
 */

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  lines = 1,
  className,
  style,
  ...props
}) => {
  const variantClasses = {
    text: 'rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
  };

  const sizeStyle: React.CSSProperties = {
    width: width || (variant === 'circular' ? height : '100%'),
    height: height || (variant === 'text' ? '1em' : '100px'),
    ...style,
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]',
              variantClasses.text,
              i === lines - 1 && 'w-3/4'
            )}
            style={{ height: height || '1em' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]',
        variantClasses[variant],
        className
      )}
      style={sizeStyle}
      {...props}
    />
  );
};

// Pre-composed skeleton variants for common use cases
const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-6 space-y-4', className)}>
    <div className="flex items-center gap-4">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </div>
    </div>
    <Skeleton variant="rounded" height={120} />
    <Skeleton variant="text" lines={3} />
  </div>
);

const SkeletonPost: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('rounded-2xl overflow-hidden border border-gray-100', className)}>
    <Skeleton variant="rectangular" height={200} />
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="text" width={100} />
      </div>
      <Skeleton variant="text" lines={2} />
      <div className="flex gap-4">
        <Skeleton variant="text" width={60} />
        <Skeleton variant="text" width={60} />
      </div>
    </div>
  </div>
);

const SkeletonTable: React.FC<{ rows?: number; className?: string }> = ({
  rows = 5,
  className,
}) => (
  <div className={cn('space-y-3', className)}>
    <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
      <Skeleton variant="text" width="20%" />
      <Skeleton variant="text" width="30%" />
      <Skeleton variant="text" width="25%" />
      <Skeleton variant="text" width="15%" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 p-4">
        <Skeleton variant="text" width="20%" />
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="text" width="25%" />
        <Skeleton variant="text" width="15%" />
      </div>
    ))}
  </div>
);

export { Skeleton, SkeletonCard, SkeletonPost, SkeletonTable };
