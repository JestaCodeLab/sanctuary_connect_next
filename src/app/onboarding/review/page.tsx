'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Church,
  MapPin,
  DollarSign,
  Edit2,
  ArrowLeft,
  Rocket,
  Mail,
  UserPlus,
  Check,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { Button, Input, Card, ProgressBar } from '@/components/ui';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useAuthStore } from '@/store/authStore';
import { organizationApi } from '@/lib/api';

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
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);

  useEffect(() => {
    if (!organizationId) {
      router.push('/onboarding/identity');
    }
  }, [organizationId, router]);

  const handleInvite = () => {
    if (!inviteEmail) {
      toast.error('Please enter an email address');
      return;
    }

    if (invitedEmails.includes(inviteEmail)) {
      toast.error('This email has already been invited');
      return;
    }

    setInvitedEmails([...invitedEmails, inviteEmail]);
    setInviteEmail('');
    toast.success('Invitation sent!');
  };

  const handleLaunch = async () => {
    if (!organizationId) return;

    setIsLoading(true);
    try {
      // Mark onboarding as complete in backend
      await organizationApi.update(organizationId, {
        onboardingComplete: true,
        onboardingStep: 5,
      });

      // Clear onboarding data
      reset();

      toast.success('Your dashboard is ready! Welcome to Sanctuary Connect!');
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

  if (!organizationId) {
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
        <div className="inline-flex items-center justify-center w-20 h-20 bg-[#E8F6FB] dark:bg-[#3AAFDC]/20 rounded-full mb-4">
          <Church className="w-10 h-10 text-[#3AAFDC]" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">You&apos;re almost there!</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Please review your settings before we launch your church dashboard. You can always make changes later.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Identity Card */}
        <Card padding="md" className="relative">
          <button
            onClick={() => router.push('/onboarding/identity')}
            className="absolute top-4 right-4 text-gray-400 hover:text-[#3AAFDC]"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-4">
            <Church className="w-5 h-5 text-[#3AAFDC]" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Identity</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3AAFDC]/10 dark:bg-[#3AAFDC]/20 rounded-lg flex items-center justify-center">
                <Church className="w-5 h-5 text-[#3AAFDC]" />
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
        <Card padding="md" className="relative">
          <button
            onClick={() => router.push('/onboarding/branches')}
            className="absolute top-4 right-4 text-gray-400 hover:text-[#3AAFDC]"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-[#3AAFDC]" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Branches ({branches.length || 1})</h3>
          </div>
          <div className="space-y-2">
            {branches.length > 0 ? (
              branches.map((branch, index) => (
                <div key={index} className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#3AAFDC] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{branch.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{branch.address}, {branch.city}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#3AAFDC] mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Main Campus</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">123 Faith St, Austin, TX</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Finances Card */}
        <Card padding="md" className="relative">
          <button
            onClick={() => router.push('/onboarding/finances')}
            className="absolute top-4 right-4 text-gray-400 hover:text-[#3AAFDC]"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-[#3AAFDC]" />
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
                    className="px-2 py-0.5 bg-[#E8F6FB] text-[#3AAFDC] text-xs rounded-full"
                  >
                    {fundBucketLabels[bucket] || bucket}
                  </span>
                ))
              ) : (
                <>
                  <span className="px-2 py-0.5 bg-[#E8F6FB] text-[#3AAFDC] text-xs rounded-full">
                    General Fund
                  </span>
                  <span className="px-2 py-0.5 bg-[#E8F6FB] text-[#3AAFDC] text-xs rounded-full">
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
        <Card padding="md" className="relative">
          <button
            onClick={() => router.push('/onboarding/subscription')}
            className="absolute top-4 right-4 text-gray-400 hover:text-[#3AAFDC]"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-[#3AAFDC]" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Plan</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3AAFDC]/10 dark:bg-[#3AAFDC]/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#3AAFDC]" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedPlan?.name || 'Growth Plan'}
                </p>
                <p className="text-xs text-[#3AAFDC] font-medium">
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

      {/* Invite Team Section */}
      <Card padding="lg" className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <UserPlus className="w-5 h-5 text-[#3AAFDC]" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Invite your team</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Collaboration is key. Add your fellow administrators or pastors to get started together.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="email@church.org"
              leftIcon={<Mail className="w-5 h-5" />}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
          </div>
          <Button
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={handleInvite}
          >
            Invite
          </Button>
        </div>

        {invitedEmails.length > 0 && (
          <div className="mt-4 space-y-2">
            {invitedEmails.map((email) => (
              <div
                key={email}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg"
              >
                <Check className="w-4 h-4 text-green-500" />
                {email}
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">Invited</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          Invited members will receive an email to set up their password.
        </p>
      </Card>

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
