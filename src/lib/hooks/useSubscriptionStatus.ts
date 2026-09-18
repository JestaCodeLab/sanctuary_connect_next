'use client';

import { useQuery } from '@tanstack/react-query';
import { subscriptionApi } from '@/lib/api';
import { useOrganizationStore } from '@/store/organizationStore';

/**
 * Renewal-banner state for the current org's subscription. Mirrors the
 * server's isSubscriptionActive/getRenewalWindowStatus (api/src/utils/
 * subscriptionStatus.js) so the two never disagree about the window.
 */
export function useSubscriptionStatus() {
  const { organization } = useOrganizationStore();

  const { data } = useQuery({
    queryKey: ['subscription', organization?._id],
    queryFn: () => subscriptionApi.get(organization!._id),
    enabled: !!organization?._id,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const subscription = data?.subscription;
  const renewalWindow = data?.renewalWindow ?? null;

  // True once an org that was ever on a paid plan (a completed paymentHistory
  // entry, or the grace-period job's autoDowngradedAt) ends up back on Seed -
  // as opposed to an org that simply signed up on Seed and never paid.
  const wasDowngraded = subscription?.planId === 'seed' && (
    !!subscription?.autoDowngradedAt ||
    (subscription?.paymentHistory ?? []).some((p: { amount: number }) => p.amount > 0)
  );

  return {
    planId: subscription?.planId ?? null,
    planName: data?.plan?.name ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    showRenewalBanner: !!renewalWindow,
    inGracePeriod: renewalWindow?.inGracePeriod ?? false,
    daysRemaining: renewalWindow?.daysRemaining ?? 0,
    wasDowngraded,
  };
}

export default useSubscriptionStatus;
