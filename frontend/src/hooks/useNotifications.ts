import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { notificationService } from '@/services/notificationService';
import type { NotificationFilterParams } from '@/types/notification.types';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params: NotificationFilterParams) => [...notificationKeys.all, 'list', params] as const,
};

export function useNotifications(params: NotificationFilterParams = {}) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationService.list(params),
    placeholderData: keepPreviousData,
  });
}
