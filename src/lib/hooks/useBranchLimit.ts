'use client';

import { useQuery } from '@tanstack/react-query';
import { subscriptionApi } from '@/lib/api';
import { useOrganizationStore } from '@/store/organizationStore';

/**
 * Shares the ['subscription-limits', orgId] query with SubscriptionTab/
 * SubscriptionPlansGrid, so an upgrade there (which invalidates that key)
 * unlocks branch creation here without a manual refetch.
 */
export function useBranchLimit() {
  const { organization } = useOrganizationStore();

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-limits', organization?._id],
    queryFn: () => subscriptionApi.getLimits(organization!._id),
    enabled: !!organization?._id,
    staleTime: 60 * 1000,
  });

  const limit = data?.limits.maxBranches ?? 1;
  const current = data?.usage.branchesCount ?? 0;
  const atLimit = !isLoading && limit !== -1 && current >= limit;

  return { atLimit, current, limit, isLoading };
}

export default useBranchLimit;
