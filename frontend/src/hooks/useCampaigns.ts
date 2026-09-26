import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { campaignService } from '@/services/campaignService';
import type { CampaignFilterParams } from '@/types/campaign.types';

export const campaignKeys = {
  all: ['campaigns'] as const,
  list: (params: CampaignFilterParams) => [...campaignKeys.all, 'list', params] as const,
  detail: (id: string) => [...campaignKeys.all, 'detail', id] as const,
  progress: (id: string) => [...campaignKeys.all, 'progress', id] as const,
};

export function useCampaigns(params: CampaignFilterParams = {}) {
  return useQuery({
    queryKey: campaignKeys.list(params),
    queryFn: () => campaignService.list(params),
    placeholderData: keepPreviousData,
    // Keep the list fresh while anything is scheduled or running.
    refetchInterval: (query) => {
      const counts = query.state.data?.statusCounts;
      return counts && counts.PENDING + counts.PROCESSING > 0 ? 5000 : false;
    },
  });
}
