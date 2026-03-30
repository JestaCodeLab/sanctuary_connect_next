'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Lock } from 'lucide-react';
import { Button, Card, ProgressBar } from '@/components/ui';
import { organizationApi } from '@/lib/api';
import { useOnboardingStore } from '@/store/onboardingStore';

const steps = [
  { id: 1, name: 'Identity' },
  { id: 2, name: 'Branches' },
  { id: 3, name: 'Currency' },
  { id: 4, name: 'Plan' },
];

const SUPPORTED_CURRENCIES = [
  { code: 'GHS', name: 'Ghana Cedi', symbol: '₵' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
];

export default function OnboardingCurrencyPage() {
  const router = useRouter();
  const { organizationId, setStep } = useOnboardingStore();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('GHS');

  useEffect(() => {
    if (!organizationId) {
      router.push('/onboarding/identity');
    }
    setStep(3);
  }, [organizationId, router, setStep]);

  const handleSubmit = async () => {
    if (!organizationId) return;

    setIsLoading(true);
    try {
      // Update organization with currency and advance to next step
      await organizationApi.update(organizationId, {
        currency: selectedCurrency,
        onboardingStep: 4,
      });

      toast.success(`Currency set to ${selectedCurrency}!`);
      router.push('/onboarding/subscription');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to save currency selection.');
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
              Step 3 of 5: Organization Currency
            </span>
          </div>
          <span className="text-sm text-[#3AAFDC]">60%</span>
        </div>
        <ProgressBar progress={60} size="md" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Choose the primary currency for your organization.
        </p>
      </div>

      {/* Title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Select Organization Currency</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Payments are powered by <span className="font-semibold">Paystack</span>, supporting all major currencies. You can change this later in settings.
        </p>
      </div>

      <div className="space-y-6">
        {/* Currency Selection */}
        <Card padding="lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SUPPORTED_CURRENCIES.map((currency) => (
              <button
                key={currency.code}
                type="button"
                onClick={() => setSelectedCurrency(currency.code)}
                className={`p-4 rounded-xl border-2 transition-all text-center ${
                  selectedCurrency === currency.code
                    ? 'border-[#3AAFDC] bg-[#E8F6FB] dark:bg-[#3AAFDC]/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="font-bold text-lg text-[#3AAFDC] mb-1">{currency.symbol}</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  {currency.code}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {currency.name}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Payment Info */}
        <Card padding="lg" className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex gap-3">
            <div className="flex-shrink-0 flex items-start pt-0.5">
              <Lock className="w-5 h-5 text-[#3AAFDC]" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Secure Payments Included
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Your organization will receive payments in {selectedCurrency} using Paystack&apos;s secure payment processing. No additional setup required.
              </p>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/onboarding/branches')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back: Branches
          </Button>
          <Button
            size="lg"
            isLoading={isLoading}
            onClick={handleSubmit}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Continue to Plans
          </Button>
        </div>
      </div>
    </div>
  );
}
