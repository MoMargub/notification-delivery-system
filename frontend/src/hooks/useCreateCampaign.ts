import { useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignService } from '@/services/campaignService';
import { campaignKeys } from './useCampaigns';

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: campaignService.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: campaignKeys.all }),
  });
}
