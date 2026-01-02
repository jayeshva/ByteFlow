
import { TriggerType, type AutomationRule, type InstagramPost, type ActivityLog } from '../types';
import { apiClient, getErrorMessage, setAuthTokens } from './http';

const API_PREFIX = '/api';

export const MetaApiService = {
  // Initiates the OAuth flow by redirecting to Meta
  connectMeta: () => {
    const clientId = import.meta.env.VITE_META_CLIENT_ID;
    const redirectUri =
      import.meta.env.VITE_META_REDIRECT_URI ||
      `${window.location.origin}/auth-callback`;
    const scope = [
      'instagram_business_basic',
      'instagram_business_manage_messages',
      'instagram_business_manage_comments',
      'instagram_business_content_publish',
      'instagram_business_manage_insights'
    ].join(',');

    if (!clientId) {
      console.error('Missing VITE_META_CLIENT_ID for Meta OAuth');
      return;
    }

    const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${encodeURIComponent(scope)}`;
    window.location.href = authUrl;
  },

  getInstagramLoginUrl: async (): Promise<string> => {
    const response = await apiClient.get('/instagram/connect-url');
    return response.data.url;
  },


  // Exchanges code for session in backend
  completeAuth: async (code: string, state: string, options?: { popup?: boolean }) => {
    const response = await apiClient.get('/instagram/callback', {
      params: { code, state, popup: options?.popup ? '1' : undefined },
    });
    return response.data;
  },
  
  // Fetches real posts via backend
  fetchPosts: async (): Promise<InstagramPost[]> => {
    try {
      const response = await apiClient.get('/instagram/posts');
      const data = Array.isArray(response.data.posts) ? response.data.posts : [];
    
      return data.map((item: any) => ({
        id: item.id,
        mediaUrl: item.media_url,
        caption: item.caption || '',
        likes: item.like_count || 0,
        thumbnailURL: item.thumbnail_url,
        comments: item.comments_count || 0,
        mediaType: item.media_type,
        timestamp: new Date(item.timestamp).toLocaleDateString()
      }));
    } catch (error) {
      console.error('Fetch posts failed:', getErrorMessage(error));
      return [];
    }
  },

  metaProfile: async (): Promise<any> => {
   try {
    const response = await apiClient.get('/instagram/me');
    return response.data.profile;
    } catch (error) { 
      console.error('Fetch profile failed:', getErrorMessage(error));
      throw error;
    }
  },

  // Fetches comments for a specific post (including replies) with pagination support
  fetchComments: async (mediaId: string, cursor?: string): Promise<{
    comments: { 
      id: string; 
      text: string; 
      username: string; 
      timestamp: string;
      replies: { id: string; text: string; username: string; timestamp: string }[];
    }[];
    paging: {
      hasMore: boolean;
      nextCursor: string | null;
    };
  }> => {
    try {
      const params: Record<string, string> = { limit: '25' };
      if (cursor) params.after = cursor;
      
      const response = await apiClient.get(`/instagram/posts/${mediaId}/comments`, { params });
      const data = Array.isArray(response.data.comments) ? response.data.comments : [];
      
      return {
        comments: data.map((item: any) => ({
          id: item.id,
          text: item.text || '',
          username: item.username || 'Instagram User',
          timestamp: item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '',
          replies: (item.replies || []).map((reply: any) => ({
            id: reply.id,
            text: reply.text || '',
            username: reply.username || 'Instagram User',
            timestamp: reply.timestamp ? new Date(reply.timestamp).toLocaleDateString() : '',
          })),
        })),
        paging: {
          hasMore: response.data.paging?.hasMore || false,
          nextCursor: response.data.paging?.nextCursor || null,
        },
      };
    } catch (error) {
      console.error('Fetch comments failed:', getErrorMessage(error));
      return { comments: [], paging: { hasMore: false, nextCursor: null } };
    }
  },



  // Syncs rule to DB
  syncRuleToBackend: async (rule: AutomationRule) => {
    const response = await apiClient.post(`${API_PREFIX}/rules`, rule);
    return response.data;
  },

  createAutomation: async (payload: Record<string, unknown>) => {
    const response = await apiClient.post('/automate', payload);
    return response.data;
  },

  updateAutomation: async (automationId: string, payload: Record<string, unknown>) => {
    const response = await apiClient.put(`/automate/${automationId}`, payload);
    return response.data;
  },

  deleteAutomation: async (automationId: string) => {
    const response = await apiClient.delete(`/automate/${automationId}`);
    return response.data;
  },

  getAutomations: async (): Promise<AutomationRule[]> => {
    try {
      const response = await apiClient.get('/automate');
      const data = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.automations)
          ? response.data.automations
          : [];

      return data.map((item: any, index: number): AutomationRule => {
        const matchType = String(item.matchType || '').toUpperCase();
        let triggerType = TriggerType.CONTAINS;
        if (matchType === 'EXACT') triggerType = TriggerType.EXACT_MATCH;
        if (matchType === 'INTENT') triggerType = TriggerType.AI_INTENT;
        if (matchType === 'ALL') triggerType = TriggerType.EVERY_COMMENT;

        return {
          id: item.id || `automation_${index}`,
          postId: item.scopeMediaId || item.postId || '',
          triggerType,
          keyword: item.triggerKeyword || item.keyword || '',
          responseMessage: item.privateReplyText || item.responseMessage || '',
          publicReply: item.publicReplyText || item.publicReply || '',
          active: typeof item.isEnabled === 'boolean' ? item.isEnabled : !!item.active,
          flowName: item.flowName || undefined,
          scheduling: item.isAutomationTimingEnabled ? {
            enabled: true,
            startDate: item.automationStartTime,
            endDate: item.automationEndTime,
          } : undefined,
          stats: {
            totalSent: Number(item.totalSent) || 0,
            engagementBoost: Number(item.engagementBoost) || 0,
            lastTriggered: item.lastTriggered || undefined,
          },
        };
      });
    } catch (error) {
      console.error('Fetch automations failed:', getErrorMessage(error));
      return [];
    }
  },

  // Fetches activity logs for Global Activity Monitor with pagination
  getActivityLogs: async (limit = 10, cursor?: string): Promise<{
    logs: ActivityLog[];
    hasMore: boolean;
    nextCursor: string | null;
  }> => {
    try {
      let url = `/automate/activity-logs?limit=${limit}`;
      if (cursor) url += `&cursor=${cursor}`;
      
      const response = await apiClient.get(url);
      return {
        logs: response.data?.logs || [],
        hasMore: response.data?.hasMore || false,
        nextCursor: response.data?.nextCursor || null
      };
    } catch (error) {
      console.error('Fetch activity logs failed:', getErrorMessage(error));
      return { logs: [], hasMore: false, nextCursor: null };
    }
  },

  // Fetches rules for local state
  fetchRules: async (): Promise<AutomationRule[]> => {
    const response = await apiClient.get(`${API_PREFIX}/rules`);
    return response.data;
  }
};


export const AuthService = {
  sendOtp: async (email: string) => {
    await new Promise(r => setTimeout(r, 800));
    console.log(`[SIMULATION] OTP sent to ${email}: 123456`);
    return { success: true };
  },

  verifyOtp: async (email: string, code: string) => {
    await new Promise(r => setTimeout(r, 600));
    // Hardcoded simulation: 123456 is always correct
    if (code === '123456') {
      return { success: true };
    }
    return { success: false, error: 'The code you entered is incorrect. Please try again.' };
  },

  signup: async (data: any) => {
    const { email, password, name } = data;
    try {
      const response = await apiClient.post('/auth/signup', { email, password, name });
      return {
        success: true,
        user: response.data.user,
        message: response.data.message,
      };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Signup failed.') };
    }
  },

  login: async (data: any) => {
    const { email, password } = data;
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const payload = response.data;
      setAuthTokens(payload.accessToken, payload.refreshToken);
      return {
        success: true,
        user: payload.user,
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message      };
    }
  },

  resetPassword: async (email: string, newPassword: string) => {
    await new Promise(r => setTimeout(r, 800));
    // const success = DatabaseService.updateUserPassword(email, newPassword);
    // if (success) {
    //   return { success: true };
    // }
    return { success: false, error: 'User not found.' };
  },

  verifyEmail: async (email: string, code: string) => {
    try {
      const response = await apiClient.post('/auth/verify-email', { email, code });
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Verification failed.'),
      };
    }
  },

  loginWithGoogle: async (googleData: any) => {
    await new Promise(r => setTimeout(r, 600));
    // let user = DatabaseService.findUserByEmail(googleData.email);
    // if (!user) {
    //   user = DatabaseService.createUser({ ...googleData, provider: 'google' });
    // }
    return { success: false, error: 'Google login not implemented.' };
  }
};

// Subscription types
export interface Plan {
  id: string;
  name: string;
  displayName: string;
  priceMonthly: number;
  dmLimitMonthly: number;
  features: string[];
}

export interface SubscriptionData {
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    dodoCustomerId?: string;
  } | null;
  plan: Plan | null;
  usage: {
    dmSentThisMonth: number;
    dmQuotaMonthly: number;
    dmSentLifetime: number;
  };
}

export const SubscriptionService = {
  getPlans: async (): Promise<{ plans: Plan[] }> => {
    const response = await apiClient.get('/subscription/plans');
    return response.data;
  },

  getCurrentSubscription: async (): Promise<SubscriptionData> => {
    const response = await apiClient.get('/subscription/current');
    return response.data;
  },

  createCheckout: async (planId: string): Promise<{ paymentLink: string; planName: string }> => {
    const response = await apiClient.post('/subscription/checkout', { planId });
    return response.data;
  },

  cancelSubscription: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/subscription/cancel');
    return response.data;
  },

  getPortalLink: async (): Promise<{ portalLink: string }> => {
    const response = await apiClient.get('/subscription/portal');
    return response.data;
  },
};
