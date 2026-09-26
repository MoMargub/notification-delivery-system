import { API_BASE_URL, apiRequest } from '@/lib/apiClient';
import type { Health } from '@/types/health.types';

export const healthService = {
  get: () => apiRequest<Health>(`${API_BASE_URL.replace(/\/api$/, '')}/health`),
};
