import type { PaginatedResponse } from './api.types';

export type Channel = 'EMAIL' | 'PUSH';
export type CampaignStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type CampaignStatusCounts = Record<CampaignStatus, number>;

export interface Campaign {
  id: string;
  title: string;
  message: string;
  channel: Channel;
  scheduledAt: string;
  status: CampaignStatus;
  totalRecipients: number;
  completedCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CampaignList extends PaginatedResponse<Campaign> {
  statusCounts: CampaignStatusCounts;
}

export interface CampaignProgress {
  status: CampaignStatus;
  totalRecipients: number;
  completedCount: number;
  failedCount: number;
  processing: number;
  pending: number;
}

export interface CampaignFilterParams {
  status?: CampaignStatus;
  channel?: Channel;
  page?: number;
  limit?: number;
}

export interface CreateCampaignInput {
  title: string;
  message: string;
  channel: Channel;
  scheduledAt: string;
  /** Omitted = all users. */
  userIds?: number[];
}
