'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Church,
  MapPin,
  DollarSign,
  ArrowLeft,
  Rocket,
  Check,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { Button, Input, Card, ProgressBar } from '@/components/ui';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useAuthStore } from '@/store/authStore';
import { organizationApi, subscriptionApi } from '@/lib/api';

const planDetails = {
  seed: { name: 'Seed Plan', price: 'Free' },
  growth: { name: 'Growth Plan', price: 'GHS 550/mo' },
  ascend: { name: 'Ascend Plan', price: 'GHS 1,000/mo' },
};

export default function OnboardingReviewPage() {
  const router = useRouter();
  const { identity, branches, finances, subscription, organizationId, reset } = useOnboardingStore();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!organizationId) {
      router.push('/onboarding/identity');
      return;
    }
    // subscription.plan is ephemeral client state - if it's missing (e.g. the user
    // resumed onboarding after losing their session mid-payment), we can't trust any
    // plan shown here. Force them back through subscription selection rather than
    // silently rendering fallback placeholder text and letting them launch on it.
    if (!subscription.plan) {
      router.push('/onboarding/subscription');
    }
  }, [organizationId, subscription.plan, router]);

  const handleLaunch = async () => {
    if (!organizationId || !subscription.plan) return;

    setIsLoading(true);
    try {
      // A paid plan was selected - verify payment actually went through (the real
      // Subscription record matches) before allowing onboarding to complete. Without
      // this, a user could select a paid plan, abandon the payment page, and still
      // "launch" straight onto the free seed plan while believing they configured a
      // paid one.
      if (subscription.plan !== 'seed') {
        const current = await subscriptionApi.get(organizationId);
        if (current.subscription.planId !== subscription.plan) {
          toast.error('Payment for your selected plan has not been completed yet.');
          router.push('/onboarding/payment');
          return;
        }
      }

      // Mark onboarding as complete in backend
      await organizationApi.update(organizationId, {
        onboardingComplete: true,
        onboardingStep: 5,
      });

      // Clear onboarding data
      reset();

      toast.success('Your dashboard is ready! Welcome to Sanctuary Connect!');

      // Add a small delay to ensure backend persistence before redirecting
      // This prevents the dashboard from checking onboarding before the update is complete
      await new Promise(resolve => setTimeout(resolve, 500));

      router.push('/dashboard');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to launch dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    // If free plan, go back to subscription, otherwise go to payment
    if (subscription.plan === 'seed') {
      router.push('/onboarding/subscription');
    } else {
      router.push('/onboarding/payment');
    }
  };

  if (!organizationId || !subscription.plan) {
    return null;
  }

  // Get selected fund buckets display
  const fundBucketLabels: Record<string, string> = {
    tithes: 'General Fund',
    offerings: 'Offerings',
    building: 'Building Project',
    missions: 'Global Missions',
  };

  const selectedPlan = subscription.plan ? planDetails[subscription.plan] : null;

  return (
    <div>
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              Step 5 of 5: Final Review & Launch
            </span>
          </div>
          <span className="text-sm text-green-500 font-medium">100%</span>
        </div>
        <ProgressBar progress={100} size="md" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Setup complete! Your sanctuary is ready to go live.
        </p>
      </div>

      {/* Success Icon */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-[#EEF2FF] dark:bg-[#4F46E5]/20 rounded-full mb-4">
          <Church className="w-10 h-10 text-[#4F46E5]" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">You&apos;re almost there!</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Please review your settings before we launch your church dashboard. You can always make changes later.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Identity Card */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-4">
            <Church className="w-5 h-5 text-[#4F46E5]" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Identity</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#4F46E5]/10 dark:bg-[#4F46E5]/20 rounded-lg flex items-center justify-center">
                <Church className="w-5 h-5 text-[#4F46E5]" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{identity.churchName || 'Grace Community'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">gracecommunity.org</p>
              </div>
            </div>
            <div className="pt-3 border-t dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">Admin: {user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{user?.email}</p>
            </div>
          </div>
        </Card>

        {/* Branches Card */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-[#4F46E5]" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Branches ({branches.length || 1})</h3>
          </div>
          <div className="space-y-2">
            {branches.length > 0 ? (
              branches.map((branch, index) => (
                <div key={index} className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#4F46E5] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{branch.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{branch.address}, {branch.city}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#4F46E5] mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Main Campus</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">123 Faith St, Austin, TX</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Finances Card */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-[#4F46E5]" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Finances</h3>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              {finances.fundBuckets.length || 4} Buckets
            </p>
            <div className="flex flex-wrap gap-1">
              {finances.fundBuckets.length > 0 ? (
                finances.fundBuckets.slice(0, 3).map((bucket) => (
                  <span
                    key={bucket}
                    className="px-2 py-0.5 bg-[#EEF2FF] text-[#4F46E5] text-xs rounded-full"
                  >
                    {fundBucketLabels[bucket] || bucket}
                  </span>
                ))
              ) : (
                <>
                  <span className="px-2 py-0.5 bg-[#EEF2FF] text-[#4F46E5] text-xs rounded-full">
                    General Fund
                  </span>
                  <span className="px-2 py-0.5 bg-[#EEF2FF] text-[#4F46E5] text-xs rounded-full">
                    Building
                  </span>
                </>
              )}
              {finances.fundBuckets.length > 3 && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded-full">
                  +{finances.fundBuckets.length - 3}
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Subscription Card */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-[#4F46E5]" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Plan</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#4F46E5]/10 dark:bg-[#4F46E5]/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#4F46E5]" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedPlan?.name || 'Growth Plan'}
                </p>
                <p className="text-xs text-[#4F46E5] font-medium">
                  {selectedPlan?.price || 'GHS 550/mo'}
                </p>
              </div>
            </div>
            <div className="pt-3 border-t dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                Billing: {subscription.billingCycle || 'Monthly'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back
        </Button>
        <div className="text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            By launching, you agree to the Terms of Service
          </p>
          <Button
            size="lg"
            isLoading={isLoading}
            onClick={handleLaunch}
            rightIcon={<Rocket className="w-5 h-5" />}
            className="min-w-[200px]"
          >
            Launch Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
