'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { usePaystackPayment } from 'react-paystack';
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  Shield,
  Info,
  Rocket,
  Sparkles,
} from 'lucide-react';
import { Button, Card, Input, Select, Checkbox } from '@/components/ui';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useAuthStore } from '@/store/authStore';
import { subscriptionApi } from '@/lib/api';

interface PaymentFormData {
  cardholderName: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  streetAddress: string;
  city: string;
  regionState: string;
  country: string;
  savePayment: boolean;
  // MoMo fields
  momoNumber: string;
  momoProvider: string;
}

const planDetails = {
  seed: { name: 'Seed Plan', price: 0 },
  growth: { name: 'Growth Plan', price: 550 },
  ascend: { name: 'Ascend Plan', price: 1000 },
};

const countries = [
  { value: 'ghana', label: 'Ghana' },
  { value: 'nigeria', label: 'Nigeria' },
  { value: 'kenya', label: 'Kenya' },
  { value: 'south_africa', label: 'South Africa' },
  { value: 'usa', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
];

const momoProviders = [
  { value: 'mtn', label: 'MTN Mobile Money' },
  { value: 'vodafone', label: 'Vodafone Cash' },
  { value: 'airteltigo', label: 'AirtelTigo Money' },
];

// Paystack public key - should be in env variable
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx';

export default function PaymentPage() {
  const router = useRouter();
  const { organizationId, subscription, setSubscription } = useOnboardingStore();
  const { user } = useAuthStore();
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'momo'>('card');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PaymentFormData>({
    defaultValues: {
      cardholderName: '',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      streetAddress: '',
      city: '',
      regionState: '',
      country: 'ghana',
      savePayment: false,
      momoNumber: '',
      momoProvider: 'mtn',
    },
  });

  // Get plan details
  const selectedPlan = subscription.plan || 'growth';
  const plan = planDetails[selectedPlan];
  const subscriptionFee = plan.price;
  const taxRate = 0.1; // 10% tax
  const tax = Math.round(subscriptionFee * taxRate);
  const total = subscriptionFee + tax;
  const billingCycle = subscription.billingCycle || 'monthly';

  // Redirect if free plan was selected
  if (selectedPlan === 'seed') {
    router.push('/onboarding/review');
    return null;
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + ' / ' + v.substring(2, 4);
    }
    return v;
  };

  // Paystack configuration
  const paystackConfig = {
    reference: `sub_${organizationId}_${Date.now()}`,
    email: user?.email || '',
    amount: total * 100, // Paystack uses kobo/pesewas (smallest currency unit)
    publicKey: PAYSTACK_PUBLIC_KEY,
    currency: 'GHS',
    channels: paymentMethod === 'momo' ? ['mobile_money'] : ['card'],
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  const onPaystackSuccess = async (reference: { reference: string }) => {
    setIsLoading(true);
    try {
      // Create subscription in backend
      await subscriptionApi.create({
        organizationId: organizationId!,
        planId: selectedPlan,
        billingCycle,
        paymentMethod,
        paymentDetails: {
          provider: 'paystack',
          reference: reference.reference,
        },
        billingAddress: paymentMethod === 'card' ? {
          street: watch('streetAddress'),
          city: watch('city'),
          state: watch('regionState'),
          country: watch('country'),
        } : undefined,
      });

      setSubscription({ paymentMethod });
      toast.success('Payment successful! Launching your dashboard...');
      router.push('/onboarding/review');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to activate subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const onPaystackClose = () => {
    toast.error('Payment cancelled');
  };

  const onSubmit = async (data: PaymentFormData) => {
    if (!organizationId) {
      toast.error('Organization not found');
      return;
    }

    // Initialize Paystack payment
    initializePayment({
      onSuccess: onPaystackSuccess,
      onClose: onPaystackClose,
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="text-[#3AAFDC]">Onboarding</span> / Payment & Billing
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Payment & Billing Setup
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Securely finalize your subscription to launch your church platform.
          </p>
        </div>
        <div className="flex items-center gap-2 text-green-500">
          <Shield className="w-5 h-5" />
          <span className="text-sm font-medium uppercase tracking-wide">Secure Checkout</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary - Left Column */}
          <Card padding="lg" className="lg:col-span-1 h-fit">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Order Summary</h2>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[#E8F6FB] dark:bg-[#3AAFDC]/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#3AAFDC]" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{plan.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {billingCycle} Billing Cycle
                </p>
              </div>
            </div>

            <div className="space-y-3 border-t dark:border-gray-700 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Subscription Fee</span>
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

          {/* Payment Form - Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Method */}
            <Card padding="lg">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Payment Method</h2>
              </div>

              {/* Payment Method Tabs */}
              <div className="flex gap-3 mb-6">
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
                    Mobile Money (MoMo)
                  </span>
                </button>
              </div>

              {/* Card Payment Fields */}
              {paymentMethod === 'card' && (
                <div className="space-y-4">
                  <Input
                    label="Cardholder Name"
                    placeholder="John Doe"
                    {...register('cardholderName', { required: 'Cardholder name is required' })}
                    error={errors.cardholderName?.message}
                  />

                  <Input
                    label="Card Number"
                    placeholder="0000 0000 0000 0000"
                    {...register('cardNumber', {
                      required: 'Card number is required',
                      onChange: (e) => {
                        e.target.value = formatCardNumber(e.target.value);
                      },
                    })}
                    error={errors.cardNumber?.message}
                    rightIcon={
                      <div className="flex gap-1">
                        <div className="w-8 h-5 bg-gray-200 dark:bg-gray-600 rounded" />
                        <div className="w-8 h-5 bg-gray-200 dark:bg-gray-600 rounded" />
                      </div>
                    }
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Expiry Date"
                      placeholder="MM / YY"
                      {...register('expiryDate', {
                        required: 'Expiry date is required',
                        onChange: (e) => {
                          e.target.value = formatExpiryDate(e.target.value);
                        },
                      })}
                      error={errors.expiryDate?.message}
                    />
                    <Input
                      label="CVV"
                      type="password"
                      placeholder="•••"
                      maxLength={4}
                      {...register('cvv', { required: 'CVV is required' })}
                      error={errors.cvv?.message}
                    />
                  </div>
                </div>
              )}

              {/* MoMo Payment Fields */}
              {paymentMethod === 'momo' && (
                <div className="space-y-4">
                  <Select
                    label="Mobile Money Provider"
                    options={momoProviders}
                    {...register('momoProvider')}
                  />

                  <Input
                    label="Mobile Money Number"
                    placeholder="024 XXX XXXX"
                    leftIcon={<Smartphone className="w-5 h-5" />}
                    {...register('momoNumber', {
                      required: 'Mobile money number is required',
                    })}
                    error={errors.momoNumber?.message}
                  />

                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">
                      You will receive a prompt on your phone to authorize the payment. Please ensure your mobile money account has sufficient balance.
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Billing Address - Only for card payments */}
            {paymentMethod === 'card' && (
              <Card padding="lg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-5 h-5 text-gray-400 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                  </div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">Billing Address</h2>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Street Address"
                      placeholder="123 Church Avenue"
                      {...register('streetAddress')}
                    />
                    <Input label="City" placeholder="Accra" {...register('city')} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Region/State"
                      placeholder="Greater Accra"
                      {...register('regionState')}
                    />
                    <Select label="Country" options={countries} {...register('country')} />
                  </div>

                  <Checkbox
                    label="Save for future payments and auto-renewals"
                    {...register('savePayment')}
                  />
                </div>
              </Card>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              leftIcon={<Rocket className="w-5 h-5" />}
            >
              Complete Payment & Launch Platform
            </Button>

            <p className="text-xs text-center text-gray-400 dark:text-gray-500">
              By clicking complete, you agree to Sanctuary Connect&apos;s{' '}
              <a href="#" className="text-[#3AAFDC] hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-[#3AAFDC] hover:underline">
                Privacy Policy
              </a>
              . Your data is encrypted and handled securely.
            </p>
          </div>
        </div>
      </form>

      {/* Back Button */}
      <div className="mt-8">
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
