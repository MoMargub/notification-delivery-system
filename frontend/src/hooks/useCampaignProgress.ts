import { useQuery } from '@tanstack/react-query';
import { campaignService } from '@/services/campaignService';
import { campaignKeys } from './useCampaigns';

const POLL_INTERVAL_MS = 2000;

/** Polls while the campaign is running; stops once it reaches COMPLETED or FAILED. */
export function useCampaignProgress(id: string) {
  return useQuery({
    queryKey: campaignKeys.progress(id),
    queryFn: () => campaignService.progress(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'COMPLETED' || status === 'FAILED' ? false : POLL_INTERVAL_MS;
    },
  });
}
