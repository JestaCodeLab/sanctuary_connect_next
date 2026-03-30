'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  Shield,
  Info,
  Rocket,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { Button, Card, ProgressBar } from '@/components/ui';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useAuthStore } from '@/store/authStore';
import { subscriptionApi, organizationApi } from '@/lib/api';

const planDetails = {
  seed: { name: 'Seed Plan', price: 0 },
  growth: { name: 'Growth Plan', price: 550 },
  ascend: { name: 'Ascend Plan', price: 1000 },
};

const TAX_RATE = 0.1; // 10% tax

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organizationId, subscription, setSubscription } = useOnboardingStore();
  const { user } = useAuthStore();
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'momo'>('card');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedPlan = subscription.plan || 'growth';
  const plan = planDetails[selectedPlan];
  const subscriptionFee = plan.price;
  const tax = Math.round(subscriptionFee * TAX_RATE);
  const total = subscriptionFee + tax;
  const billingCycle = subscription.billingCycle || 'monthly';

  // Handle redirect from Paystack
  useEffect(() => {
    const reference = searchParams.get('reference');
    
    if (reference && !isProcessing) {
      handlePaystackCallback(reference);
    }
  }, [searchParams]);

  // Redirect if free plan was selected
  if (selectedPlan === 'seed') {
    router.push('/onboarding/review');
    return null;
  }

  const handlePaystackCallback = async (reference: string) => {
    if (!organizationId) {
      toast.error('Organization not found');
      return;
    }

    setIsProcessing(true);
    try {
      // Create subscription with payment reference
      await subscriptionApi.create({
        organizationId,
        planId: selectedPlan,
        billingCycle,
        paymentMethod,
        paymentDetails: {
          provider: 'paystack',
          reference,
        },
      });

      setSubscription({ paymentMethod });
      toast.success('Payment successful! Launching your dashboard...');
      
      // Update onboarding step to review
      await organizationApi.update(organizationId, { onboardingStep: 5 });
      
      router.push('/onboarding/review');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Payment verification failed');
      setIsProcessing(false);
    }
  };

  const handleInitializeCheckout = async () => {
    if (!organizationId) {
      toast.error('Organization not found');
      return;
    }

    setIsLoading(true);
    try {
      // Call backend to initialize Paystack checkout
      const response = await subscriptionApi.initializeCheckout({
        organizationId,
        planId: selectedPlan,
        billingCycle,
        paymentMethod,
        amount: total,
      });

      if (response.authorizationUrl) {
        // Redirect to Paystack checkout
        window.location.href = response.authorizationUrl;
      } else {
        toast.error('Failed to initialize payment');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to initialize checkout');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              Step 5 of 5: Secure Payment
            </span>
          </div>
          <span className="text-sm text-[#3AAFDC]">100%</span>
        </div>
        <ProgressBar progress={100} size="md" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Complete your subscription to launch your church platform.
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Secure Checkout
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Finalize your subscription powered by Paystack.
          </p>
        </div>
        <div className="flex items-center gap-2 text-green-500">
          <Shield className="w-5 h-5" />
          <span className="text-sm font-medium uppercase tracking-wide">Secure</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Order Summary */}
        <Card padding="lg" className="lg:col-span-1 h-fit">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Order Summary</h2>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#E8F6FB] dark:bg-[#3AAFDC]/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#3AAFDC]" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{plan.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {billingCycle} Billing
              </p>
            </div>
          </div>

          <div className="space-y-3 border-t dark:border-gray-700 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Subscription</span>
              <span className="text-gray-900 dark:text-gray-100">
                GHS {subscriptionFee.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Platform Tax (10%)</span>
              <span className="text-gray-900 dark:text-gray-100">GHS {tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t dark:border-gray-700">
              <span className="font-semibold text-gray-900 dark:text-gray-100">Total Due</span>
              <span className="text-xl font-bold text-[#3AAFDC]">GHS {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Your next billing date will be 30 days from today.
            </p>
          </div>
        </Card>

        {/* Payment Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Method Selection */}
          <Card padding="lg">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Payment Method</h2>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  paymentMethod === 'card'
                    ? 'border-[#3AAFDC] bg-[#E8F6FB] dark:bg-[#3AAFDC]/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'card' ? 'border-[#3AAFDC]' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {paymentMethod === 'card' && (
                    <div className="w-2 h-2 rounded-full bg-[#3AAFDC]" />
                  )}
                </div>
                <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Credit / Debit Card
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('momo')}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  paymentMethod === 'momo'
                    ? 'border-[#3AAFDC] bg-[#E8F6FB] dark:bg-[#3AAFDC]/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'momo' ? 'border-[#3AAFDC]' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {paymentMethod === 'momo' && (
                    <div className="w-2 h-2 rounded-full bg-[#3AAFDC]" />
                  )}
                </div>
                <Smartphone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Mobile Money
                </span>
              </button>
            </div>
          </Card>

          {/* Payment Info */}
          <Card padding="lg" className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex gap-3">
              <div className="flex-shrink-0 flex items-start pt-0.5">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Secured by Paystack
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Your payment details are processed securely by Paystack. We never store your card or account information.
                </p>
              </div>
            </div>
          </Card>

          {/* Checkout Button */}
          <Button
            size="lg"
            className="w-full"
            isLoading={isLoading}
            disabled={isProcessing}
            onClick={handleInitializeCheckout}
            leftIcon={<Rocket className="w-5 h-5" />}
          >
            Proceed to Secure Checkout
          </Button>

          <p className="text-xs text-center text-gray-400 dark:text-gray-500">
            By clicking continue, you agree to Sanctuary Connect&apos;s{' '}
            <a href="#" className="text-[#3AAFDC] hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-[#3AAFDC] hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>

      {/* Back Button */}
      <div>
        <Button
          variant="ghost"
          onClick={() => router.push('/onboarding/subscription')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Plan Selection
        </Button>
      </div>
    </div>
  );
}
