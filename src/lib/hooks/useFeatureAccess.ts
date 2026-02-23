'use client';

import { useQuery } from '@tanstack/react-query';
import { organizationApi, subscriptionApi } from '@/lib/api';

interface FeatureInfo {
  key: string;
  name: string;
  included: boolean;
}

interface UseFeatureAccessReturn {
  hasFeature: (featureKey: string) => boolean;
  isLoading: boolean;
  planId: string | null;
  planName: string | null;
  features: FeatureInfo[];
}

export function useFeatureAccess(): UseFeatureAccessReturn {
  // First fetch the organization to get its ID
  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ['my-organization'],
    queryFn: () => organizationApi.getMyOrganization(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const organizationId = orgData?.organization?._id;

  // Then fetch the subscription with plan details
  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ['subscription', organizationId],
    queryFn: () => subscriptionApi.get(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const isLoading = orgLoading || subLoading;
  const plan = subData?.plan ?? null;
  const features: FeatureInfo[] = (plan?.features as FeatureInfo[] | undefined) ?? [];

  const hasFeature = (featureKey: string): boolean => {
    if (isLoading || !plan) return false;

    // Sanctuary plan with all_features key includes everything
    const hasAllFeatures = features.some(f => f.key === 'all_features' && f.included);
    if (hasAllFeatures) return true;

    const feature = features.find(f => f.key === featureKey);
    return feature?.included ?? false;
  };

  return {
    hasFeature,
    isLoading,
    planId: subData?.subscription?.planId ?? null,
    planName: plan?.name ?? null,
    features,
  };
}

export default useFeatureAccess;
