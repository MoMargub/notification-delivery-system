import { useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignService } from '@/services/campaignService';
import { campaignKeys } from './useCampaigns';

export function useProcessCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: campaignService.process,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: campaignKeys.all }),
  });
}
