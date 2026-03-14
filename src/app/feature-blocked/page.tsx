'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui';
import { useOrganizationStore } from '@/store/organizationStore';
import { subscriptionApi } from '@/lib/api';

interface PlanFeature {
  key: string;
  name?: string;
  text?: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  features: PlanFeature[];
}

interface SubscriptionData {
  subscription: {
    planId: string;
    status: string;
  };
  plan: Plan;
}

function FeatureBlockedContent() {
  const router = useRouter();
  const { organization } = useOrganizationStore();
  const [featureKey, setFeatureKey] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for store hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Get feature key from sessionStorage
  useEffect(() => {
    try {
      const blockedFeature = sessionStorage.getItem('featureBlockedFeatureKey');
      console.log('[FeatureBlockedPage] Retrieved blockedFeature from sessionStorage:', blockedFeature);
      
      if (blockedFeature) {
        setFeatureKey(blockedFeature);
        // Clear it after reading
        sessionStorage.removeItem('featureBlockedFeatureKey');
      } else {
        console.warn('[FeatureBlockedPage] No featureBlockedFeatureKey found in sessionStorage');
      }
    } catch (err) {
      console.error('Failed to retrieve feature key from sessionStorage:', err);
    }
  }, []);

  // Fetch subscription and plan data
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        // Wait for store to hydrate
        if (!isHydrated) {
          console.log('[FeatureBlockedPage] Waiting for store hydration...');
          return;
        }

        if (!organization?._id) {
          console.error('[FeatureBlockedPage] No organization ID after hydration:', { organizationId: organization?._id });
          setError('No organization found');
          setIsLoading(false);
          return;
        }

        console.log('[FeatureBlockedPage] Fetching subscription for org:', organization._id);
        const data = await subscriptionApi.get(organization._id);
        console.log('[FeatureBlockedPage] Fetched subscription data:', data);
        setSubscriptionData(data);
      } catch (err) {
        console.error('Failed to fetch subscription:', err);
        setError('Unable to load plan details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptionData();
  }, [organization?._id, isHydrated]);

  // Get feature details from plan
  const getFeatureDetails = () => {
    if (!featureKey || !subscriptionData?.plan) {
      return {
        name: 'Feature',
        description: 'This feature is not included in your current plan',
      };
    }

    const feature = subscriptionData.plan.features.find(f => f.key === featureKey);
    if (feature) {
      const featureName = feature.name || feature.text || featureKey;
      return {
        name: featureName,
        description: `${featureName} is not included in your current plan`,
      };
    }

    // Fallback: format the key as display name
    return {
      name: featureKey
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' '),
      description: 'This feature is not included in your current plan',
    };
  };

  // Get minimum plan that includes this feature
  const getMinimumPlan = () => {
    if (!featureKey) return 'Growth Plan';

    // Find the first plan (in order) that has this feature enabled
    const planOrder = ['seed', 'growth', 'ascend', 'sanctuary'];
    const planNames: Record<string, string> = {
      seed: 'Seed Plan',
      growth: 'Growth Plan',
      ascend: 'Ascend Plan',
      sanctuary: 'Sanctuary Plan',
    };

    // For demo purposes, assume the feature requires at least Growth
    // In production, this should come from the API
    if (featureKey.includes('sms') || featureKey.includes('birthday')) {
      return 'Growth Plan';
    }
    if (featureKey.includes('advanced') || featureKey.includes('event_management')) {
      return 'Ascend Plan';
    }

    return 'Growth Plan';
  };

  // Get recommended upgrade plan
  const getRecommendedPlan = () => {
    const currentPlanId = subscriptionData?.subscription?.planId || 'seed';
    const upgradePath: Record<string, string> = {
      seed: 'Growth Plan',
      growth: 'Ascend Plan',
      ascend: 'Sanctuary Plan',
      sanctuary: 'Sanctuary Plan',
    };
    return upgradePath[currentPlanId] || 'Growth Plan';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full space-y-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3AAFDC]"></div>
          </div>
          <p className="text-center text-muted">Loading your plan details...</p>
        </div>
      </div>
    );
  }

  if (error || !subscriptionData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-foreground">Error</h1>
            <p className="text-muted">{error || 'Unable to load subscription information'}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="w-full px-4 py-2 rounded-lg border border-border text-foreground hover:bg-background transition-colors text-sm font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const feature = getFeatureDetails();
  const currentPlanName = subscriptionData.plan?.name || 'Current Plan';
  const minimumPlanName = getMinimumPlan();
  const recommendedPlanName = getRecommendedPlan();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full space-y-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3AAFDC]"></div>
          </div>
          <p className="text-center text-muted">Loading your plan details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-foreground">Feature Locked</h1>
          <p className="text-muted">{feature.name} is not included in your current plan</p>
        </div>

        {/* Feature Details */}
        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">{feature.name}</p>
            <p className="text-sm text-muted mt-1">{feature.description}</p>
          </div>

          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">Current Plan</p>
                <p className="text-sm font-semibold text-foreground">{currentPlanName}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted" />
              <div>
                <p className="text-xs text-muted">Minimum Required</p>
                <p className="text-sm font-semibold text-primary">{minimumPlanName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Link href="/dashboard/settings/subscription">
            <Button className="w-full" size="lg">
              <Zap className="w-4 h-4 mr-2" />
              Upgrade Your Plan
            </Button>
          </Link>
          <button
            onClick={() => router.back()}
            className="w-full px-4 py-2 rounded-lg border border-border text-foreground hover:bg-background transition-colors text-sm font-medium"
          >
            Go Back
          </button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/30 p-3">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Upgrade to the <strong>{recommendedPlanName}</strong> plan to unlock this feature and grow your organization.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FeatureBlockedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted">Loading...</div>
      </div>
    }>
      <FeatureBlockedContent />
    </Suspense>
  );
}
