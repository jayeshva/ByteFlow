import React from 'react';
import { useForm, type UseFormReturn, type FieldValues, type DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';
import { cn } from '../../lib/cn';
import { AlertCircle } from 'lucide-react';

/**
 * Form Component
 * Wrapper for react-hook-form with Zod validation
 */

interface FormProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  onSubmit: (data: T) => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export function Form<T extends FieldValues>({
  form,
  onSubmit,
  children,
  className,
}: FormProps<T>) {
  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn('space-y-6', className)}
      noValidate
    >
      {children}
    </form>
  );
}

/**
 * useZodForm Hook
 * Creates a form with Zod validation
 */
interface UseZodFormOptions<T extends FieldValues> {
  schema: ZodType<T>;
  defaultValues?: DefaultValues<T>;
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all';
}

export function useZodForm<T extends FieldValues>({
  schema,
  defaultValues,
  mode = 'onBlur',
}: UseZodFormOptions<T>) {
  return useForm<T>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any) as any,
    defaultValues,
    mode,
  });
}

/**
 * FormField Component
 * Wrapper for form fields with label and error display
 */
interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  helperText,
  children,
  className,
}) => {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {(error || helperText) && (
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
};

/**
 * FormInput Component
 * Input field with form integration
 */
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  hasError?: boolean;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ icon, hasError, className, ...props }, ref) => {
    return (
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
          className={cn(
            'w-full px-4 py-3 rounded-xl bg-gray-50/50 border border-gray-200 outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400',
            'focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100',
            hasError && 'border-red-500 focus:border-red-500 focus:ring-red-100',
            icon && 'pl-11',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

/**
 * FormTextarea Component
 */
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ hasError, className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full px-4 py-3 rounded-xl bg-gray-50/50 border border-gray-200 outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400 resize-none',
          'focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100',
          hasError && 'border-red-500 focus:border-red-500 focus:ring-red-100',
          className
        )}
        {...props}
      />
    );
  }
);

FormTextarea.displayName = 'FormTextarea';

/**
 * FormSelect Component
 */
interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string }>;
  hasError?: boolean;
  placeholder?: string;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ options, hasError, placeholder, className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full px-4 py-3 rounded-xl bg-gray-50/50 border border-gray-200 outline-none transition-all font-medium text-gray-900',
          'focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100',
          hasError && 'border-red-500 focus:border-red-500 focus:ring-red-100',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
);

FormSelect.displayName = 'FormSelect';

/**
 * FormCheckbox Component
 */
interface FormCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export const FormCheckbox = React.forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <label className={cn('flex items-center gap-3 cursor-pointer group', className)}>
        <input
          ref={ref}
          type="checkbox"
          className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          {...props}
        />
        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
          {label}
        </span>
      </label>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox';

/**
 * FormSwitch Component
 */
interface FormSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const FormSwitch: React.FC<FormSwitchProps> = ({
  checked,
  onChange,
  label,
  disabled,
  className,
}) => {
  return (
    <label className={cn('flex items-center gap-3 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
          checked ? 'bg-indigo-600' : 'bg-gray-200'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
            checked && 'translate-x-5'
          )}
        />
      </button>
      {label && (
        <span className="text-sm font-medium text-gray-700">
          {label}
        </span>
      )}
    </label>
  );
};
