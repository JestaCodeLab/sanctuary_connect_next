'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Check, X, Sparkles } from 'lucide-react';
import { Button, Card, ProgressBar } from '@/components/ui';
import { useOnboardingStore } from '@/store/onboardingStore';
import { subscriptionApi, organizationApi } from '@/lib/api';
import type { SubscriptionPlan, BillingCycle, PlanDetails } from '@/types';

const plans: PlanDetails[] = [
  {
    id: 'seed',
    name: 'Seed Plan',
    price: 0,
    currency: 'GHS',
    description: 'Perfect for small plants',
    features: [
      { text: 'Basic Member Directory', included: true },
      { text: 'Bulletin Management', included: true },
      { text: 'Email Support', included: true },
      { text: 'Analytics (Restricted)', included: false },
    ],
  },
  {
    id: 'growth',
    name: 'Growth Plan',
    price: 550,
    currency: 'GHS',
    description: 'Ideal for established churches',
    features: [
      { text: 'Everything in Seed', included: true },
      { text: 'Advanced Analytics', included: true },
      { text: 'GHS Payments Integration', included: true },
      { text: 'Priority Support', included: true },
    ],
    isPopular: true,
  },
  {
    id: 'ascend',
    name: 'Ascend Plan',
    price: 1000,
    currency: 'GHS',
    description: 'For multi-site organizations',
    features: [
      { text: 'Everything in Growth', included: true },
      { text: 'Multi-site Management', included: true },
      { text: 'API Access', included: true },
      { text: 'Dedicated Account Manager', included: true },
    ],
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const { organizationId, subscription, setSubscription } = useOnboardingStore();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(subscription.billingCycle || 'monthly');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(subscription.plan);
  const [isLoading, setIsLoading] = useState(false);

  const getPrice = (plan: PlanDetails) => {
    if (plan.price === 0) return 'Free';
    const price = billingCycle === 'annual' ? Math.round(plan.price * 10) : plan.price;
    return `${plan.currency} ${price.toLocaleString()}`;
  };

  const getPriceSuffix = (plan: PlanDetails) => {
    if (plan.price === 0) return '/mo';
    return billingCycle === 'annual' ? '/yr' : '/mo';
  };

  const handleSelectPlan = (planId: SubscriptionPlan) => {
    setSelectedPlan(planId);
    setSubscription({ plan: planId, billingCycle });
  };

  const handleContinue = async () => {
    if (!selectedPlan || !organizationId) return;

    setSubscription({ plan: selectedPlan, billingCycle });

    // If free plan selected, create subscription and go to review
    if (selectedPlan === 'seed') {
      setIsLoading(true);
      try {
        await subscriptionApi.create({
          organizationId,
          planId: 'seed',
          billingCycle,
        });

        // Update onboarding step to 5 (review)
        await organizationApi.update(organizationId, { onboardingStep: 5 });

        toast.success('Free plan activated!');
        router.push('/onboarding/review');
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } } };
        toast.error(err.response?.data?.error || 'Failed to activate plan');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Update step to 5 before going to payment
      await organizationApi.update(organizationId, { onboardingStep: 5 });
      router.push('/onboarding/payment');
    }
  };

  return (
    <div>
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              Step 4 of 5: Choose Your Plan
            </span>
          </div>
          <span className="text-sm text-[#3AAFDC] font-medium">80%</span>
        </div>
        <ProgressBar progress={80} size="md" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Almost there! Pick a plan that fits your congregation&apos;s needs.
        </p>
      </div>

      {/* Title Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Empower Your Ministry
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-lg mx-auto">
          Select a subscription plan that grows with your church. You can upgrade or downgrade at any time.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
            billingCycle === 'monthly'
              ? 'bg-[#3AAFDC] text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle('annual')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
            billingCycle === 'annual'
              ? 'bg-[#3AAFDC] text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Annual
        </button>
        {billingCycle === 'annual' && (
          <span className="ml-2 text-xs text-green-500 font-medium">Save ~17%</span>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            padding="lg"
            className={`relative transition-all ${
              selectedPlan === plan.id
                ? 'ring-2 ring-[#3AAFDC] shadow-lg'
                : plan.isPopular
                ? 'ring-2 ring-[#3AAFDC]/50'
                : ''
            }`}
          >
            {/* Most Popular Badge */}
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#3AAFDC] text-white text-xs font-medium rounded-full">
                  <Sparkles className="w-3 h-3" />
                  Most Popular
                </span>
              </div>
            )}

            {/* Plan Header */}
            <div className="text-center mb-6 pt-2">
              <p className="text-xs font-medium text-[#3AAFDC] uppercase tracking-wide mb-2">
                {plan.name}
              </p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                  {getPrice(plan)}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  {getPriceSuffix(plan)}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {plan.description}
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-6">
              {plan.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  {feature.included ? (
                    <Check className="w-5 h-5 text-[#3AAFDC] flex-shrink-0" />
                  ) : (
                    <X className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      feature.included
                        ? 'text-gray-700 dark:text-gray-300'
                        : 'text-gray-400 dark:text-gray-500 line-through'
                    }`}
                  >
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Select Button */}
            <Button
              variant={selectedPlan === plan.id ? 'primary' : plan.isPopular ? 'primary' : 'outline'}
              className="w-full"
              onClick={() => handleSelectPlan(plan.id)}
            >
              {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
            </Button>
          </Card>
        ))}
      </div>

      {/* Custom Plan Link */}
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-8">
        Need a custom plan for your organization?{' '}
        <a href="#" className="text-[#3AAFDC] hover:underline">
          Contact our sales team
        </a>
      </p>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push('/onboarding/finances')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back
        </Button>
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!selectedPlan}
          isLoading={isLoading}
          rightIcon={<ArrowRight className="w-5 h-5" />}
        >
          {selectedPlan === 'seed' ? 'Continue to Review' : 'Continue to Payment'}
        </Button>
      </div>
    </div>
  );
}
