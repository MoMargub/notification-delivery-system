import { apiRequest } from '@/lib/apiClient';
import type { CursorPage } from '@/types/api.types';
import type { Notification, NotificationFilterParams } from '@/types/notification.types';

export const notificationService = {
  list: (params: NotificationFilterParams) => apiRequest<CursorPage<Notification>>('/notifications', { params }),
  hide: (id: number) => apiRequest<{ id: number; isVisible: false }>(`/notifications/${id}/hide`, { method: 'PATCH' }),
};
