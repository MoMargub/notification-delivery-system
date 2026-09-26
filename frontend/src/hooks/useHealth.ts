import { useQuery } from '@tanstack/react-query';
import { healthService } from '@/services/healthService';

/** The API answers 503 with a body when a dependency is down; that surfaces as an error, i.e. "unknown". */
export function useHealth(enabled = true) {
  return useQuery({ queryKey: ['health'], queryFn: healthService.get, refetchInterval: 5000, enabled });
}
