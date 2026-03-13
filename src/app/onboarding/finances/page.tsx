'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Link2,
  Lock,
  Building
} from 'lucide-react';
import { Button, Card, Checkbox, ProgressBar } from '@/components/ui';
import { organizationApi } from '@/lib/api';
import { useOnboardingStore } from '@/store/onboardingStore';

const steps = [
  { id: 1, name: 'Identity' },
  { id: 2, name: 'Branches' },
  { id: 3, name: 'Finances' },
  { id: 4, name: 'Team' },
];

const defaultFundBuckets = [
  { id: 'tithes', name: 'Tithes', description: 'The standard fund for church operations and staff.', checked: true },
  { id: 'offerings', name: 'Offerings', description: 'Unrestricted gifts for general use.', checked: true },
  { id: 'building', name: 'Building Fund', description: 'Specifically for renovations and new campus construction.', checked: false },
  { id: 'missions', name: 'Global Missions', description: 'Support for missionaries and international outreach programs.', checked: false },
];

export default function OnboardingFinancesPage() {
  const router = useRouter();
  const { organizationId, setFinances, setStep } = useOnboardingStore();
  const [isLoading, setIsLoading] = useState(false);
  const [fundBuckets, setFundBuckets] = useState(defaultFundBuckets);

  useEffect(() => {
    if (!organizationId) {
      router.push('/onboarding/identity');
    }
    setStep(3);
  }, [organizationId, router, setStep]);

  const toggleFundBucket = (id: string) => {
    setFundBuckets(buckets =>
      buckets.map(bucket =>
        bucket.id === id ? { ...bucket, checked: !bucket.checked } : bucket
      )
    );
  };

  const handleSubmit = async () => {
    if (!organizationId) return;

    setIsLoading(true);
    try {
      // Update organization with onboarding step (Paystack is the default gateway)
      await organizationApi.update(organizationId, {
        paymentGateway: 'paystack',
        onboardingStep: 4,
      });

      // Create fund buckets
      const selectedBuckets = fundBuckets.filter(b => b.checked);
      for (const bucket of selectedBuckets) {
        await organizationApi.createFundBucket(organizationId, {
          name: bucket.name,
          description: bucket.description,
          enabled: true,
        });
      }

      // Update store
      setFinances({
        paymentGateway: 'paystack',
        fundBuckets: selectedBuckets.map(b => b.id),
      });

      toast.success('Financial setup saved!');
      router.push('/onboarding/subscription');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to save financial settings.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!organizationId) {
    return null;
  }

  return (
    <div>
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              Step 3 of 5: Financial Setup
            </span>
          </div>
          <span className="text-sm text-[#3AAFDC]">60%</span>
        </div>
        <ProgressBar progress={60} size="md" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Setting the foundation for your church&apos;s generosity.
        </p>
      </div>

      {/* Title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financial Ecosystem</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Configure your currency, connect payment processors, and define your initial fund categories to start accepting donations.
        </p>
      </div>

      <div className="space-y-8">
        {/* Fund Buckets Section */}
        <Card padding="lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#E8F6FB] dark:bg-[#3AAFDC]/20 rounded-lg flex items-center justify-center">
              <span className="text-[#3AAFDC] font-bold text-sm">$</span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">1. Initial Fund Buckets</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Where should donations go? Select the default categories you want to offer your members.</p>
            </div>
          </div>

          <div className="space-y-3">
            {fundBuckets.map((bucket) => (
              <div
                key={bucket.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                  bucket.checked ? 'border-[#3AAFDC] bg-[#E8F6FB]/50 dark:bg-[#3AAFDC]/10' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
                onClick={() => toggleFundBucket(bucket.id)}
              >
                <Checkbox
                  checked={bucket.checked}
                  onChange={() => toggleFundBucket(bucket.id)}
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">{bucket.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{bucket.description}</p>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="flex items-center gap-2 text-[#3AAFDC] hover:text-[#2D9AC7] text-sm font-medium mt-4"
              onClick={() => toast.error('Custom funds available after initial setup')}
            >
              <Plus className="w-4 h-4" />
              Add Custom Fund
            </button>
          </div>
        </Card>

        {/* Bank Account Section */}
        <Card padding="lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#E8F6FB] dark:bg-[#3AAFDC]/20 rounded-lg flex items-center justify-center">
              <Building className="w-4 h-4 text-[#3AAFDC]" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">2. Payout & Reconciliation</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Link your church&apos;s primary bank account for automated payouts and effortless reconciliation.</p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-8 text-center">
            <Link2 className="w-10 h-10 text-gray-300 dark:text-gray-500 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100">No account linked yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
              Connect your bank securely via Plaid to automate your financial workflow and track deposits in real-time.
            </p>
            <Button
              variant="primary"
              leftIcon={<Lock className="w-4 h-4" />}
              onClick={() => toast.error('Bank connection available after initial setup')}
            >
              Connect Secure Bank Account
            </Button>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              256-bit Encrypted
            </p>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/onboarding/branches')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back: Admin Settings
          </Button>
          <Button
            size="lg"
            isLoading={isLoading}
            onClick={handleSubmit}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Save & Continue
          </Button>
        </div>
      </div>

      {/* Security Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" />
          Your financial data is protected with enterprise-grade encryption.
        </p>
        <div className="flex items-center justify-center gap-4 mt-2 text-xs">
          <a href="#" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Terms of Service</a>
          <a href="#" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Privacy Policy</a>
          <a href="#" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Security Whitepaper</a>
        </div>
      </div>
    </div>
  );
}
