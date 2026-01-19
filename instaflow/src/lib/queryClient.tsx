import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import store from '../store/store';
import { showErrorToast } from '../store/slices/toastSlice';
import { getErrorMessage } from '../services/api/client';

/**
 * React Query Configuration
 * Centralized query client with optimized defaults for production
 */

export const queryClient = new QueryClient({
    queryCache: new QueryCache({
        onError: (error, query) => {
            // If the query has a meta.onError, let it handle the error (or call it)
            if (query.meta?.onError && typeof query.meta.onError === 'function') {
                (query.meta.onError as (error: unknown) => void)(error);
            } else {
                // Background refetches that fail shouldn't necessarily spam toasts
                // unless we explicitly want them to.
                if (query.state.data === undefined) {
                    store.dispatch(showErrorToast(getErrorMessage(error, 'Failed to fetch data')));
                }
            }
        },
    }),
    mutationCache: new MutationCache({
        onError: (error, _variables, _context, mutation) => {
            // Check if the mutation has its own onError handled in the hook
            // If not, show a global toast
            if (mutation.options.onError) return;

            store.dispatch(showErrorToast(getErrorMessage(error, 'Action failed')));
        },
    }),
    defaultOptions: {
        queries: {
            // Stale time: data is fresh for 30 seconds
            staleTime: 30 * 1000,
            // Cache time: unused data stays in cache for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Retry failed requests up to 2 times
            retry: 1, // Reduced retry for better UX with toasts
            // Exponential backoff for retries
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Don't refetch on window focus in production to reduce API calls
            refetchOnWindowFocus: import.meta.env.PROD ? false : true,
            // Don't refetch on reconnect automatically
            refetchOnReconnect: 'always',
        },
        mutations: {
            // Retry mutations once
            retry: 0, // Usually don't want to retry mutations automatically
        },
    },
});


/**
 * Query Provider Component
 * Wraps the app with React Query context
 */
interface QueryProviderProps {
    children: ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
    return (
        <QueryClientProvider client= { queryClient } >
        { children }
        </QueryClientProvider>
    );
};

/**
 * Query Keys Factory
 * Centralized query key management for consistent caching
 */
export const queryKeys = {
    // User/Profile queries
    user: {
        all: ['user'] as const,
        profile: () => [...queryKeys.user.all, 'profile'] as const,
        subscription: () => [...queryKeys.user.all, 'subscription'] as const,
    },

    // Instagram queries
    instagram: {
        all: ['instagram'] as const,
        posts: () => [...queryKeys.instagram.all, 'posts'] as const,
        post: (id: string) => [...queryKeys.instagram.all, 'post', id] as const,
        comments: (postId: string) => [...queryKeys.instagram.all, 'comments', postId] as const,
        profile: () => [...queryKeys.instagram.all, 'profile'] as const,
    },

    // Automation queries
    automations: {
        all: ['automations'] as const,
        list: () => [...queryKeys.automations.all, 'list'] as const,
        detail: (id: string) => [...queryKeys.automations.all, 'detail', id] as const,
        activityLogs: (cursor?: string) => [...queryKeys.automations.all, 'logs', cursor] as const,
    },

    // Subscription queries
    subscription: {
        all: ['subscription'] as const,
        current: () => [...queryKeys.subscription.all, 'current'] as const,
        plans: () => [...queryKeys.subscription.all, 'plans'] as const,
    },
} as const;

export default queryClient;
