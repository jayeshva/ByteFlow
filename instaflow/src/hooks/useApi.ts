import { useState, useCallback, useRef } from 'react';
import { useToast } from './useToast';
import { getErrorMessage, type ApiError } from '../services/api/client';

/**
 * useApi Hook
 * Generic hook for API calls with loading state, error handling, and toast integration
 */

interface UseApiOptions<T> {
    /** Called on successful response */
    onSuccess?: (data: T) => void;
    /** Called on error */
    onError?: (error: ApiError) => void;
    /** Show success toast automatically */
    showSuccessToast?: boolean;
    /** Success toast message */
    successMessage?: string;
    /** Show error toast automatically (default: true) */
    showErrorToast?: boolean;
    /** Custom error message transform */
    errorMessageTransform?: (error: ApiError) => string;
}

interface UseApiState<T> {
    data: T | null;
    error: ApiError | null;
    isLoading: boolean;
}

interface UseApiResult<T, TArgs extends unknown[]> extends UseApiState<T> {
    /** Execute the API call */
    execute: (...args: TArgs) => Promise<T | null>;
    /** Reset the state */
    reset: () => void;
    /** Set loading state manually (useful for optimistic updates) */
    setIsLoading: (loading: boolean) => void;
}

export function useApi<T, TArgs extends unknown[] = []>(
    apiFunction: (...args: TArgs) => Promise<T>,
    options: UseApiOptions<T> = {}
): UseApiResult<T, TArgs> {
    const {
        onSuccess,
        onError,
        showSuccessToast = false,
        successMessage = 'Operation completed successfully',
        showErrorToast = true,
        errorMessageTransform,
    } = options;

    const toast = useToast();
    const [state, setState] = useState<UseApiState<T>>({
        data: null,
        error: null,
        isLoading: false,
    });

    // Track if component is mounted to prevent state updates after unmount
    const isMountedRef = useRef(true);

    const execute = useCallback(
        async (...args: TArgs): Promise<T | null> => {
            setState((prev) => ({ ...prev, isLoading: true, error: null }));

            try {
                const result = await apiFunction(...args);

                if (isMountedRef.current) {
                    setState({ data: result, error: null, isLoading: false });

                    if (showSuccessToast) {
                        toast.success(successMessage);
                    }

                    onSuccess?.(result);
                }

                return result;
            } catch (err) {
                const apiError = err as ApiError;

                if (isMountedRef.current) {
                    setState((prev) => ({ ...prev, error: apiError, isLoading: false }));

                    if (showErrorToast) {
                        const errorMsg = errorMessageTransform
                            ? errorMessageTransform(apiError)
                            : getErrorMessage(apiError);
                        toast.error(errorMsg);
                    }

                    onError?.(apiError);
                }

                return null;
            }
        },
        [apiFunction, onSuccess, onError, showSuccessToast, successMessage, showErrorToast, errorMessageTransform, toast]
    );

    const reset = useCallback(() => {
        setState({ data: null, error: null, isLoading: false });
    }, []);

    const setIsLoading = useCallback((loading: boolean) => {
        setState((prev) => ({ ...prev, isLoading: loading }));
    }, []);

    return {
        ...state,
        execute,
        reset,
        setIsLoading,
    };
}

/**
 * useMutation Hook
 * Specialized hook for mutation operations (POST, PUT, DELETE)
 * with optimistic update support
 */
interface UseMutationOptions<T, TArgs extends unknown[]> extends UseApiOptions<T> {
    /** Optimistic update function - called before API call */
    optimisticUpdate?: (...args: TArgs) => void;
    /** Rollback function - called on error after optimistic update */
    rollback?: (...args: TArgs) => void;
}

export function useMutation<T, TArgs extends unknown[] = []>(
    mutationFunction: (...args: TArgs) => Promise<T>,
    options: UseMutationOptions<T, TArgs> = {}
): UseApiResult<T, TArgs> {
    const { optimisticUpdate, rollback, ...apiOptions } = options;
    const argsRef = useRef<TArgs | null>(null);

    const wrappedFunction = useCallback(
        async (...args: TArgs): Promise<T> => {
            argsRef.current = args;

            if (optimisticUpdate) {
                optimisticUpdate(...args);
            }

            try {
                return await mutationFunction(...args);
            } catch (error) {
                if (rollback && argsRef.current) {
                    rollback(...argsRef.current);
                }
                throw error;
            }
        },
        [mutationFunction, optimisticUpdate, rollback]
    );

    return useApi(wrappedFunction, {
        ...apiOptions,
        showSuccessToast: apiOptions.showSuccessToast ?? true,
        successMessage: apiOptions.successMessage ?? 'Changes saved successfully',
    });
}

export default useApi;
