import { apiRequest } from '@/lib/apiClient';
import type {
  Campaign,
  CampaignFilterParams,
  CampaignList,
  CampaignProgress,
  CreateCampaignInput,
} from '@/types/campaign.types';

export const campaignService = {
  list: (params: CampaignFilterParams) => apiRequest<CampaignList>('/campaigns', { params }),
  get: (id: string) => apiRequest<Campaign>(`/campaigns/${id}`),
  progress: (id: string) => apiRequest<CampaignProgress>(`/campaigns/${id}/progress`),
  create: (body: CreateCampaignInput) => apiRequest<Campaign>('/campaigns', { method: 'POST', body }),
  process: (id: string) => apiRequest<Campaign>(`/campaigns/${id}/process`, { method: 'POST' }),
};
