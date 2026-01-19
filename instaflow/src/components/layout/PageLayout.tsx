import React from 'react';
import { cn } from '../../lib/cn';

/**
 * PageContainer Component
 * Consistent page layout wrapper with header, optional sidebar, and content area
 */

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className,
  maxWidth = '7xl',
}) => {
  return (
    <div
      className={cn(
        'w-full mx-auto px-4 sm:px-6 lg:px-8 py-6',
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * PageHeader Component
 * Page title with optional description and actions
 */
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  breadcrumb,
  className,
}) => {
  return (
    <div className={cn('mb-8', className)}>
      {breadcrumb && <div className="mb-4">{breadcrumb}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-gray-500 font-medium">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
};

/**
 * PageSection Component
 * Semantic section within a page
 */
interface PageSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export const PageSection: React.FC<PageSectionProps> = ({
  title,
  description,
  children,
  className,
  action,
}) => {
  return (
    <section className={cn('mb-8', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && (
              <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
};

/**
 * EmptyState Component
 * Displayed when a list or section has no content
 */
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-gray-500 mb-6 max-w-sm">{description}</p>
      )}
      {action}
    </div>
  );
};

/**
 * LoadingState Component
 * Full-page or section loading indicator
 */
interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
};

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  className,
  size = 'md',
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12',
        className
      )}
    >
      <div
        className={cn(
          'border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin',
          sizeClasses[size]
        )}
      />
      {message && (
        <p className="mt-4 text-gray-500 font-medium">{message}</p>
      )}
    </div>
  );
};

/**
 * ErrorState Component
 * Error display with retry option
 */
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center text-red-500 mb-4">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500 mb-6 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

/**
 * Divider Component
 */
interface DividerProps {
  label?: string;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ label, className }) => {
  if (label) {
    return (
      <div className={cn('relative my-8', className)}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 text-sm font-medium text-gray-400">
            {label}
          </span>
        </div>
      </div>
    );
  }

  return <div className={cn('border-t border-gray-200 my-8', className)} />;
};
