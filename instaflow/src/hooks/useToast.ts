import { useCallback, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import {
    addToast,
    removeToast,
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    showInfoToast,
    type ToastVariant,
} from '../store/slices/toastSlice';
import { generateId } from '../lib/utils';
import { TOAST_CONFIG } from '../lib/constants';

/**
 * useToast Hook
 * Provides easy access to show toast notifications from any component
 */

interface ToastOptions {
    title?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export const useToast = () => {
    const dispatch = useDispatch();
    const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    // Clean up timeouts on unmount
    useEffect(() => {
        return () => {
            timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
        };
    }, []);

    const scheduleRemoval = useCallback((id: string, duration: number) => {
        const timeout = setTimeout(() => {
            dispatch(removeToast(id));
            timeoutsRef.current.delete(id);
        }, duration);
        timeoutsRef.current.set(id, timeout);
    }, [dispatch]);

    const toast = useCallback(
        (variant: ToastVariant, message: string, options?: ToastOptions) => {
            const id = generateId();
            const duration = options?.duration || TOAST_CONFIG.DEFAULT_DURATION_MS;

            dispatch(
                addToast({
                    id,
                    variant,
                    message,
                    title: options?.title,
                    duration,
                    action: options?.action,
                })
            );

            scheduleRemoval(id, duration);
            return id;
        },
        [dispatch, scheduleRemoval]
    );

    const success = useCallback(
        (message: string, options?: ToastOptions) => {
            const id = generateId();
            const duration = options?.duration || TOAST_CONFIG.SUCCESS_DURATION_MS;
            dispatch(showSuccessToast(message, options?.title));
            scheduleRemoval(id, duration);
        },
        [dispatch, scheduleRemoval]
    );

    const error = useCallback(
        (message: string, options?: ToastOptions) => {
            const id = generateId();
            const duration = options?.duration || TOAST_CONFIG.ERROR_DURATION_MS;
            dispatch(showErrorToast(message, options?.title));
            scheduleRemoval(id, duration);
        },
        [dispatch, scheduleRemoval]
    );

    const warning = useCallback(
        (message: string, options?: ToastOptions) => {
            const id = generateId();
            const duration = options?.duration || TOAST_CONFIG.DEFAULT_DURATION_MS;
            dispatch(showWarningToast(message, options?.title));
            scheduleRemoval(id, duration);
        },
        [dispatch, scheduleRemoval]
    );

    const info = useCallback(
        (message: string, options?: ToastOptions) => {
            const id = generateId();
            const duration = options?.duration || TOAST_CONFIG.DEFAULT_DURATION_MS;
            dispatch(showInfoToast(message, options?.title));
            scheduleRemoval(id, duration);
        },
        [dispatch, scheduleRemoval]
    );

    const dismiss = useCallback(
        (id: string) => {
            const timeout = timeoutsRef.current.get(id);
            if (timeout) {
                clearTimeout(timeout);
                timeoutsRef.current.delete(id);
            }
            dispatch(removeToast(id));
        },
        [dispatch]
    );

    return {
        toast,
        success,
        error,
        warning,
        info,
        dismiss,
    };
};

export default useToast;
