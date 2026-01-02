
export enum TriggerType {
  EXACT_MATCH = 'EXACT_MATCH',
  CONTAINS = 'CONTAINS',
  EVERY_COMMENT = 'EVERY_COMMENT',
  AI_INTENT = 'AI_INTENT'
}

export type SentimentType = 'POSITIVE' | 'QUESTION' | 'PURCHASE_INTENT' | 'ANY';

export interface InstagramPost {
  id: string;
  imageUrl: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
}

export interface AutomationRule {
  id: string;
  postId: string;
  triggerType: TriggerType;
  sentimentTarget?: SentimentType;
  keyword?: string;
  responseMessage: string;
  publicReply?: string;
  active: boolean;
  stats: {
    totalSent: number;
    engagementBoost: number;
    lastTriggered?: string;
  };
}

export interface UserProfile {
  username: string;
  fullName: string;
  profilePic: string;
  followers: number;
  isLoggedIn: boolean;
}

export interface ActivityLog {
  id: string;
  username: string;
  comment: string;
  action: string;
  timestamp: string;
  sentiment: string;
}


export interface AutomationRequest {
    scopeType: string;
    scopeMediaId: string;
    automationType: string;
    matchType: string;
    triggerKeyword?: string;
    intentLabel?: string;
    flowName?: string;
    enablePublicReply: boolean;
    publicReplyText?: string;
    privateReplyText: string;
    isAutomationTimingEnabled: boolean;
    automationStartTime?: string;
    automationEndTime?: string;
}