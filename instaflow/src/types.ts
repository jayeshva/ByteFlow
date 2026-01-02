
export enum TriggerType {
  EXACT_MATCH = 'EXACT_MATCH',
  CONTAINS = 'CONTAINS',
  EVERY_COMMENT = 'EVERY_COMMENT',
  AI_INTENT = 'AI_INTENT'
}

export type SentimentType = 'POSITIVE' | 'QUESTION' | 'PURCHASE_INTENT' | 'ANY';

export interface InstagramPost {
  id: string;
  mediaUrl: string;
  thumbnailURL?: string;
  caption: string;
  likes: number;
  comments: number;
  mediaType: string;
  timestamp: string;
}

export interface AutomationRule {
  id: string;
  postId?: string;
  scopeType?: string;
  scopeMediaId?: string;
  automationType?: AutomationType;
  type?: AutomationType;
  triggerType: TriggerType;
  sentimentTarget?: SentimentType;
  keyword?: string;
  responseMessage?: string;
  privateReplyText?: string;
  publicReply?: string;
  isPublicReplyEnabled?: boolean;
  askForFollow?: boolean;
  intentLabel?: string;
  collectEmail?: boolean;
  active: boolean;
  flowName?: string;
  scheduling?: {
    enabled: boolean;
    startDate?: string;
    endDate?: string;
  };
  stats: {
    totalSent: number;
    engagementBoost: number;
    lastTriggered?: string;
  };
}

export interface UserProfile {
  userFullName?: string;
  username?: string;
  email: string;
  igName?: string;
  fullName: string;
  profilePic?: string;
  profilePictureUrl?: string;
  followers?: number;
  followersCount?: number;
  followingCount?: number;
  following?: number;
  isLoggedIn: boolean;
  isIGConnected: boolean;
}

export interface ActivityLog {
  id: string;
  username: string;
  comment: string;
  action: string;
  timestamp: string;
  sentiment: string;
  flowName?: string;
}

export enum AutomationType {
  COMMENT = 'COMMENT',
  STORY = 'STORY',
  LIVE = 'LIVE',
  DM = 'DM'
}