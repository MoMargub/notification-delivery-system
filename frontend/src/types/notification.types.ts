import type { Channel } from './campaign.types';

export type NotificationStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';

export interface Notification {
  id: number;
  campaignId: string;
  campaignTitle: string;
  userId: number;
  userName: string;
  userEmail: string;
  message: string;
  channel: Channel;
  status: NotificationStatus;
  retryCount: number;
  lastError: string | null;
  isVisible: boolean;
  createdAt: string;
  processedAt: string | null;
}

export interface NotificationFilterParams {
  userId?: number;
  status?: NotificationStatus;
  channel?: Channel;
  cursor?: string;
  limit?: number;
}
