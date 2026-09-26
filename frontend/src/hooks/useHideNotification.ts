import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/notificationService';
import { notificationKeys } from './useNotifications';

export function useHideNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationService.hide,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
