import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import type { UserFilterParams } from '@/types/user.types';

export function useUsers(params: UserFilterParams = {}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => userService.list(params),
    placeholderData: keepPreviousData,
  });
}
