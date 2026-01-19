import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { generateId } from '../../lib/utils';
import { TOAST_CONFIG } from '../../lib/constants';

/**
 * Toast State Management
 * Redux slice for managing toast notifications globally
 */

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
    id: string;
    variant: ToastVariant;
    title?: string;
    message: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastState {
    toasts: ToastMessage[];
}

const initialState: ToastState = {
    toasts: [],
};

const toastSlice = createSlice({
    name: 'toast',
    initialState,
    reducers: {
        addToast: (
            state,
            action: PayloadAction<Omit<ToastMessage, 'id'> & { id?: string }>
        ) => {
            const toast: ToastMessage = {
                ...action.payload,
                id: action.payload.id || generateId(),
                duration: action.payload.duration || TOAST_CONFIG.DEFAULT_DURATION_MS,
            };

            // Limit max toasts
            if (state.toasts.length >= TOAST_CONFIG.MAX_TOASTS) {
                state.toasts.shift();
            }

            state.toasts.push(toast);
        },

        removeToast: (state, action: PayloadAction<string>) => {
            state.toasts = state.toasts.filter((t) => t.id !== action.payload);
        },

        clearAllToasts: (state) => {
            state.toasts = [];
        },
    },
});

export const { addToast, removeToast, clearAllToasts } = toastSlice.actions;
export default toastSlice.reducer;

// Action creators for common toast types
export const showSuccessToast = (message: string, title?: string) =>
    addToast({
        variant: 'success',
        message,
        title,
        duration: TOAST_CONFIG.SUCCESS_DURATION_MS,
    });

export const showErrorToast = (message: string, title?: string) =>
    addToast({
        variant: 'error',
        message,
        title: title || 'Error',
        duration: TOAST_CONFIG.ERROR_DURATION_MS,
    });

export const showWarningToast = (message: string, title?: string) =>
    addToast({
        variant: 'warning',
        message,
        title,
        duration: TOAST_CONFIG.DEFAULT_DURATION_MS,
    });

export const showInfoToast = (message: string, title?: string) =>
    addToast({
        variant: 'info',
        message,
        title,
        duration: TOAST_CONFIG.DEFAULT_DURATION_MS,
    });
