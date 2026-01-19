import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { getErrorMessage } from '../services/api/client';

import { MetaApiService, SubscriptionService } from '../services/api';
import { useToast } from './useToast';

import type {
    NormalizedPost,
} from '../schemas/instagram.schema';
import type { AutomationResponse } from '../schemas/automation.schema';
import type { Plan } from '../schemas/subscription.schema';


/**
 * Instagram Hooks
 * Type-safe React Query hooks for Instagram data
 */

// Fetch Instagram posts
export const useInstagramPosts = () => {
    const toast = useToast();

    return useQuery({
        queryKey: queryKeys.instagram.posts(),
        queryFn: () => MetaApiService.fetchPosts() as Promise<NormalizedPost[]>,
        meta: {
            onError: () => {
                toast.error('Failed to load posts. Please try again.');
            },
        },
    });
};


// Fetch Instagram profile
export const useInstagramProfile = () => {
    const toast = useToast();
    return useQuery({
        queryKey: queryKeys.instagram.profile(),
        queryFn: () => MetaApiService.metaProfile(),
        staleTime: 5 * 60 * 1000,
        meta: {
            onError: (error: any) => {
                toast.error(getErrorMessage(error, 'Failed to load Instagram profile.'));
            },
        },
    });
};



// Fetch comments for a post
export const usePostComments = (postId: string, enabled = true) => {
    const toast = useToast();
    return useQuery({
        queryKey: queryKeys.instagram.comments(postId),
        queryFn: () => MetaApiService.fetchComments(postId),
        enabled: enabled && !!postId,
        meta: {
            onError: (error: any) => {
                toast.error(getErrorMessage(error, 'Failed to load comments.'));
            },
        },
    });
};



/**
 * Automation Hooks
 */

// Fetch all automations
export const useAutomations = () => {
    const toast = useToast();

    return useQuery({
        queryKey: queryKeys.automations.list(),
        queryFn: () => MetaApiService.getAutomations() as Promise<AutomationResponse[]>,

        meta: {
            onError: () => {
                toast.error('Failed to load automations.');
            },
        },
    });
};


// Create automation mutation
export const useCreateAutomation = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (payload: Record<string, unknown>) => MetaApiService.createAutomation(payload),

        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.automations.all });
            toast.success('Automation created successfully!');
        },
        onError: (error) => {
            toast.error(getErrorMessage(error, 'Failed to create automation.'));
        },
    });
};

// Update automation mutation
export const useUpdateAutomation = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
            MetaApiService.updateAutomation(id, payload),

        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.automations.all });
            toast.success('Automation updated successfully!');
        },
        onError: (error) => {
            toast.error(getErrorMessage(error, 'Failed to update automation.'));
        },
    });
};

// Delete automation mutation
export const useDeleteAutomation = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (id: string) => MetaApiService.deleteAutomation(id),

        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.automations.all });
            toast.success('Automation deleted.');
        },
        onError: (error) => {
            toast.error(getErrorMessage(error, 'Failed to delete automation.'));
        },
    });
};

// Toggle automation status
export const useToggleAutomation = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
            MetaApiService.updateAutomation(id, { isEnabled }),

        onMutate: async ({ id, isEnabled }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: queryKeys.automations.list() });

            // Snapshot the previous value
            const previousAutomations = queryClient.getQueryData<AutomationResponse[]>(
                queryKeys.automations.list()
            );

            // Optimistically update
            if (previousAutomations) {
                queryClient.setQueryData<AutomationResponse[]>(
                    queryKeys.automations.list(),
                    previousAutomations.map((a) =>
                        a.id === id ? { ...a, isEnabled, active: isEnabled } : a
                    )
                );
            }

            return { previousAutomations };
        },
        onError: (error, _variables, context) => {
            // Rollback on error
            if (context?.previousAutomations) {
                queryClient.setQueryData(queryKeys.automations.list(), context.previousAutomations);
            }
            toast.error(getErrorMessage(error, 'Failed to update automation.'));
        },
    });
};

// Fetch activity logs
export const useActivityLogs = (limit = 10) => {
    const toast = useToast();
    return useQuery({
        queryKey: queryKeys.automations.activityLogs(),
        queryFn: () => MetaApiService.getActivityLogs(limit),
        meta: {
            onError: (error: any) => {
                toast.error(getErrorMessage(error, 'Failed to load activity logs.'));
            },
        },
    });
};



/**
 * Subscription Hooks
 */

// Fetch current subscription
export const useCurrentSubscription = () => {
    const toast = useToast();
    return useQuery({
        queryKey: queryKeys.subscription.current(),
        queryFn: () => SubscriptionService.getCurrentSubscription(),
        staleTime: 60 * 1000, // Fresh for 1 minute
        meta: {
            onError: (error: any) => {
                toast.error(getErrorMessage(error, 'Failed to load subscription details.'));
            },
        },
    });
};


// Fetch available plans
export const useSubscriptionPlans = () => {
    const toast = useToast();
    return useQuery({
        queryKey: queryKeys.subscription.plans(),
        queryFn: async (): Promise<Plan[]> => {
            const response = await SubscriptionService.getPlans();
            return response.plans;
        },
        staleTime: 5 * 60 * 1000, // Plans are fresh for 5 minutes
        meta: {
            onError: (error: any) => {
                toast.error(getErrorMessage(error, 'Failed to load subscription plans.'));
            },
        },
    });
};


// Create checkout session
export const useCreateCheckout = () => {
    const toast = useToast();

    return useMutation({
        mutationFn: (planId: string) => SubscriptionService.createCheckout(planId),

        onSuccess: (data) => {
            if (data.paymentLink) {
                window.location.href = data.paymentLink;
            }
        },
        onError: (error) => {
            toast.error(getErrorMessage(error, 'Failed to start checkout.'));
        },
    });
};

// Cancel subscription
export const useCancelSubscription = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: () => SubscriptionService.cancelSubscription(),

        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.subscription.current() });
            toast.success('Subscription cancelled successfully.');
        },
        onError: (error) => {
            toast.error(getErrorMessage(error, 'Failed to cancel subscription.'));
        },
    });
};
