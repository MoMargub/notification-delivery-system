import { useQuery } from '@tanstack/react-query';
import { campaignService } from '@/services/campaignService';
import { campaignKeys } from './useCampaigns';

export function useCampaign(id: string) {
  return useQuery({ queryKey: campaignKeys.detail(id), queryFn: () => campaignService.get(id) });
}
