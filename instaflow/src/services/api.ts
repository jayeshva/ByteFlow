
import { TriggerType, type AutomationRule, type InstagramPost, type ActivityLog } from '../types';
import { apiClient, getErrorMessage, setAuthTokens } from './api/client';



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
    return response.data.data.url;
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
    const response = await apiClient.get('/instagram/posts');
    const data = Array.isArray(response.data.data) ? response.data.data : [];

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
  },


  metaProfile: async (): Promise<any> => {
    const response = await apiClient.get('/instagram/me');
    // Backend returns {success: true, data: {profile: {...}}}
    const data = response.data.data || response.data;
    return data.profile || data;
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
    const params: Record<string, string> = { limit: '25' };
    if (cursor) params.after = cursor;

    const response = await apiClient.get(`/instagram/posts/${mediaId}/comments`, { params });
    const result = response.data.data;

    return {
      comments: (result?.comments || []).map((comment: any) => ({
        id: comment.id,
        text: comment.text || '',
        username: comment.username || 'Instagram User',
        timestamp: comment.timestamp ? new Date(comment.timestamp).toLocaleDateString() : '',
        likeCount: comment.like_count || 0,
        replies: (comment.replies?.data || []).map((reply: any) => ({
          id: reply.id,
          text: reply.text || '',
          username: reply.username || 'Instagram User',
          timestamp: reply.timestamp ? new Date(reply.timestamp).toLocaleDateString() : '',
        })),
      })),
      paging: {
        hasMore: result?.paging?.hasMore || false,
        nextCursor: result?.paging?.nextCursor || null,
      },
    };
  },


  createAutomation: async (payload: Record<string, unknown>) => {
    const response = await apiClient.post('/automate', payload);
    return response.data.data;
  },

  updateAutomation: async (automationId: string, payload: Record<string, unknown>) => {
    const response = await apiClient.put(`/automate/${automationId}`, payload);
    return response.data.data;
  },

  deleteAutomation: async (automationId: string) => {
    const response = await apiClient.delete(`/automate/${automationId}`);
    return response.data;
  },

  getAutomations: async (): Promise<AutomationRule[]> => {
    const response = await apiClient.get('/automate');
    // Backend returns { success: true, data: [...] }
    const data = Array.isArray(response.data.data) ? response.data.data : [];

    return data.map((item: any, index: number): AutomationRule => {
      const matchType = String(item.matchType || '').toUpperCase();
      let triggerType = TriggerType.CONTAINS;
      if (matchType === 'EXACT') triggerType = TriggerType.EXACT_MATCH;
      if (matchType === 'INTENT') triggerType = TriggerType.AI_INTENT;
      if (matchType === 'ALL') triggerType = TriggerType.EVERY_COMMENT;

      return {
        id: item.id || `automation_${index}`,
        postId: item.scopeMediaId || item.postId || '',
        scopeType: item.scopeType,
        scopeMediaId: item.scopeMediaId,
        triggerType,
        keyword: item.triggerKeyword || item.keyword || '',
        triggerKeywords: item.triggerKeywords || [],
        responseMessage: item.privateReplyText || item.responseMessage || '',
        privateReplyText: item.privateReplyText,
        publicReply: item.publicReplyText || item.publicReply || '',
        publicReplies: item.publicReplies || [],
        isPublicReplyEnabled: item.enablePublicReply || false,
        enablePublicReply: item.enablePublicReply || false,
        active: typeof item.isEnabled === 'boolean' ? item.isEnabled : !!item.active,
        flowName: item.flowName || undefined,
        // Require Follow
        requireFollow: item.requireFollow || false,
        followPromptText: item.followPromptText || undefined,
        // CTA Buttons
        ctaButtons: item.ctaButtons || [],
        scheduling: item.isAutomationTimingEnabled ? {
          enabled: true,
          startDate: item.automationStartTime,
          endDate: item.automationEndTime,
        } : undefined,
        stats: {
          totalSent: Number(item.executionCount) || Number(item.totalSent) || 0,
          engagementBoost: Number(item.engagementBoost) || 0,
          lastTriggered: item.updatedAt || item.lastTriggered || undefined,
        },
      };
    });
  },


  // Fetches activity logs for Global Activity Monitor with pagination
  getActivityLogs: async (limit = 10, cursor?: string): Promise<{
    logs: ActivityLog[];
    hasMore: boolean;
    nextCursor: string | null;
  }> => {
    let url = `/automate/activity-logs?limit=${limit}`;
    if (cursor) url += `&cursor=${cursor}`;

    const response = await apiClient.get(url);
    const result = response.data.data;

    return {
      logs: result?.logs || [],
      hasMore: result?.hasMore || false,
      nextCursor: result?.nextCursor || null
    };
  },
};


export const AuthService = {
  // Send OTP for login verification
  sendOtp: async (email: string) => {
    try {
      const response = await apiClient.post('/auth/otp/send', { email });
      return { success: true, message: response.data.message };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Failed to send OTP.') };
    }
  },

  // Verify OTP and complete login
  verifyOtp: async (email: string, otp: string) => {
    try {
      const response = await apiClient.post('/auth/otp/verify', { email, otp });
      const payload = response.data.data;
      setAuthTokens(payload.accessToken, payload.refreshToken);
      return {
        success: true,
        user: payload.user,
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
      };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Invalid OTP.') };
    }
  },

  // Request password reset email
  forgotPassword: async (email: string) => {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return { success: true, message: response.data.message };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Failed to send reset email.') };
    }
  },

  // Verify reset code before allowing password change
  verifyResetCode: async (email: string, code: string) => {
    try {
      const response = await apiClient.post('/auth/verify-reset-code', { email, code });
      return { success: true, message: response.data.message };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Invalid reset code.') };
    }
  },

  // Reset password with token from email
  resetPassword: async (email: string, token: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/reset-password', { email, token, password });
      return { success: true, message: response.data.message };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Failed to reset password.') };
    }
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

      if (payload.data?.otpRequired) {
        return {
          success: true,
          otpRequired: true,
          email: payload.data.email
        };
      }

      const { accessToken, refreshToken, user } = payload.data;
      setAuthTokens(accessToken, refreshToken);
      return {
        success: true,
        user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      return {
        success: false,
        message: getErrorMessage(error)
      };
    }
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

  loginWithGoogle: async (idToken: string) => {
    try {
      const response = await apiClient.post('/auth/google-login', { idToken });
      const payload = response.data.data;
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
        error: getErrorMessage(error, 'Google login failed.')
      };
    }
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
    // Backend returns {success: true, data: {plans: [...]}}
    return response.data.data || response.data;
  },

  getCurrentSubscription: async (): Promise<SubscriptionData> => {
    const response = await apiClient.get('/subscription/current');
    // Backend returns {success: true, data: {...}}
    return response.data.data || response.data;
  },

  createCheckout: async (planId: string): Promise<{ paymentLink: string; planName: string }> => {
    const response = await apiClient.post('/subscription/checkout?provider=cashfree', { planId });
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

export const AnalyticsApiService = {
  getOverview: async (): Promise<any> => {
    const response = await apiClient.get('/analytics/overview');
    return response.data.data;
  },

  getAutomationAnalytics: async (automationId: string): Promise<any> => {
    const response = await apiClient.get(`/analytics/automation/${automationId}`);
    return response.data.data;
  }
};
