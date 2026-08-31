'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { roleApi } from '@/lib/api';

interface UsePermissionsReturn {
  hasPermission: (permissionKey: string) => boolean;
  isLoading: boolean;
  isCustomRole: boolean;
}

/**
 * Resolves the current user's effective permission set. Only role==='custom'
 * users are ever restricted by this - admin/pastor/staff/member's access is
 * governed entirely by the existing static role checks, unaffected by this hook.
 */
export function usePermissions(): UsePermissionsReturn {
  const user = useAuthStore((state) => state.user);
  const isCustomRole = user?.role === 'custom';

  const { data, isLoading } = useQuery({
    queryKey: ['my-custom-role', user?.customRoleId],
    queryFn: () => roleApi.get(user!.customRoleId!),
    enabled: isCustomRole && !!user?.customRoleId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const permissions: string[] = data?.role?.permissions ?? [];

  const hasPermission = (permissionKey: string): boolean => {
    if (!isCustomRole) return false; // irrelevant for non-custom roles, they don't route through this
    return permissions.includes(permissionKey);
  };

  return {
    hasPermission,
    isLoading: isCustomRole ? isLoading : false,
    isCustomRole,
  };
}

export default usePermissions;
