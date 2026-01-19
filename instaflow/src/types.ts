
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
  triggerKeywords?: string[];
  responseMessage?: string;

  privateReplyText?: string;
  publicReply?: string;
  publicReplies?: string[];
  isPublicReplyEnabled?: boolean;
  enablePublicReply?: boolean;


  askForFollow?: boolean;
  intentLabel?: string;
  collectEmail?: boolean;
  active: boolean;
  flowName?: string;
  // Require Follow feature
  requireFollow?: boolean;
  followPromptText?: string;
  // CTA Buttons
  ctaButtons?: Array<{ id: string; label: string; url: string }>;
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