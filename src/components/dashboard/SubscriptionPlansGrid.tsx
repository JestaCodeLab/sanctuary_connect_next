'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usePaystackPayment } from 'react-paystack';
import { Users, Building, MessageSquare, Check, X as XIcon, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { subscriptionApi } from '@/lib/api';
import type { SubscriptionPlanResponse } from '@/lib/api';

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx';
const TAX_RATE = 0.1;

function PaystackUpgradeButton({
  plan,
  billingCycle,
  organization,
  userEmail,
  currentPlanPrice,
  isCurrentPlan,
  isExpired,
}: {
  plan: SubscriptionPlanResponse;
  billingCycle: 'monthly' | 'annual';
  organization: any;
  userEmail: string;
  currentPlanPrice: number;
  isCurrentPlan: boolean;
  isExpired: boolean;
}) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);

  const isUpgrade = plan.price > currentPlanPrice;
  const isDowngrade = plan.price < currentPlanPrice;

  const planPrice = billingCycle === 'annual' && plan.annualPrice ? plan.annualPrice : plan.price;
  const totalWithTax = Math.round(planPrice * (1 + TAX_RATE));
  const amountInPesewas = totalWithTax * 100;

  const config = {
    reference: `upgrade_${organization._id}_${plan.id}_${Date.now()}`,
    email: userEmail,
    amount: amountInPesewas,
    currency: 'GHS',
    publicKey: PAYSTACK_PUBLIC_KEY,
    metadata: {
      custom_fields: [
        { display_name: 'Organization', variable_name: 'organization_id', value: organization._id },
        { display_name: 'Plan', variable_name: 'plan_id', value: plan.id },
        { display_name: 'Billing Cycle', variable_name: 'billing_cycle', value: billingCycle },
      ],
    },
  };

  const initializePayment = usePaystackPayment(config);

  const downgradeMutation = useMutation({
    mutationFn: () =>
      subscriptionApi.update(organization._id, { planId: plan.id, billingCycle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-limits'] });
      toast.success(`Downgraded to ${plan.name}`);
      setShowDowngradeConfirm(false);
    },
    onError: () => {
      toast.error('Failed to change plan');
    },
  });

  const renewMutation = useMutation({
    mutationFn: () => subscriptionApi.renew(organization._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-limits'] });
      toast.success(`${plan.name} renewed!`);
      setIsProcessing(false);
    },
    onError: () => {
      toast.error('Failed to renew plan');
      setIsProcessing(false);
    },
  });

  const handleRenewClick = () => {
    if (plan.price === 0) {
      setIsProcessing(true);
      renewMutation.mutate();
      return;
    }

    // Paid plan: same Paystack popup + verify flow used for upgrades - price
    // is unchanged so verifyUpgrade labels this a 'renewal' server-side.
    setIsProcessing(true);
    initializePayment({
      onSuccess: async (response: { reference: string }) => {
        try {
          await subscriptionApi.verifyUpgrade(organization._id, {
            reference: response.reference,
            planId: plan.id,
            billingCycle,
          });
          queryClient.invalidateQueries({ queryKey: ['subscription'] });
          queryClient.invalidateQueries({ queryKey: ['subscription-limits'] });
          toast.success(`${plan.name} renewed!`);
        } catch {
          toast.error('Payment received but verification failed. Please contact support.');
        } finally {
          setIsProcessing(false);
        }
      },
      onClose: () => {
        setIsProcessing(false);
      },
    });
  };

  const handleUpgradeClick = () => {
    if (plan.price === 0) {
      // Downgrade to free — show confirmation
      setShowDowngradeConfirm(true);
      return;
    }

    if (isDowngrade) {
      setShowDowngradeConfirm(true);
      return;
    }

    // Upgrade — trigger Paystack payment
    setIsProcessing(true);
    initializePayment({
      onSuccess: async (response: { reference: string }) => {
        try {
          await subscriptionApi.verifyUpgrade(organization._id, {
            reference: response.reference,
            planId: plan.id,
            billingCycle,
          });
          queryClient.invalidateQueries({ queryKey: ['subscription'] });
          queryClient.invalidateQueries({ queryKey: ['subscription-limits'] });
          toast.success(`Upgraded to ${plan.name}!`);
        } catch {
          toast.error('Payment received but verification failed. Please contact support.');
        } finally {
          setIsProcessing(false);
        }
      },
      onClose: () => {
        setIsProcessing(false);
      },
    });
  };

  if (isCurrentPlan) {
    if (isExpired) {
      return (
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={handleRenewClick}
          isLoading={isProcessing || renewMutation.isPending}
        >
          Renew
        </Button>
      );
    }
    return (
      <Button variant="outline" size="sm" className="w-full" disabled>
        Current Plan
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={plan.isPopular ? 'primary' : 'outline'}
        size="sm"
        className="w-full"
        onClick={handleUpgradeClick}
        isLoading={isProcessing || downgradeMutation.isPending}
      >
        {isUpgrade ? 'Upgrade' : plan.price === 0 ? 'Downgrade' : 'Switch Plan'}
        <ArrowRight className="w-4 h-4 ml-1" />
      </Button>

      {/* Downgrade Confirmation Modal */}
      {showDowngradeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Confirm Downgrade</h3>
            </div>
            <p className="text-sm text-muted mb-2">
              Are you sure you want to switch to <strong>{plan.name}</strong>?
            </p>
            {plan.price === 0 ? (
              <p className="text-sm text-muted mb-6">
                Your plan will change immediately. You may lose access to premium features.
              </p>
            ) : (
              <p className="text-sm text-muted mb-6">
                Your plan will change at the end of your current billing period.
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowDowngradeConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={downgradeMutation.isPending}
                onClick={() => downgradeMutation.mutate()}
              >
                Confirm Downgrade
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function SubscriptionPlansGrid({
  organization,
  currentPlanId,
  currentPeriodEnd,
  userEmail,
}: {
  organization: any;
  currentPlanId?: string;
  currentPeriodEnd?: string | Date;
  userEmail: string;
}) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const isExpired = currentPeriodEnd ? new Date(currentPeriodEnd) < new Date() : false;

  const { data: allPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: subscriptionApi.getPlans,
  });

  const currentPlan = allPlans.find((p: SubscriptionPlanResponse) => p.id === currentPlanId);

  if (plansLoading) {
    return (
      <Card padding="lg">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  if (allPlans.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Available Plans</h2>
          <p className="text-sm text-muted">Compare plans and upgrade your subscription</p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white dark:bg-gray-700 text-foreground shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              billingCycle === 'annual'
                ? 'bg-white dark:bg-gray-700 text-foreground shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Annual
            <span className="ml-1 text-green-600 dark:text-green-400">Save 17%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {allPlans
          .filter((plan: SubscriptionPlanResponse) => plan.price !== null)
          .map((plan: SubscriptionPlanResponse) => {
            const isCurrentPlan = plan.id === currentPlanId;
            const displayPrice = billingCycle === 'annual' && plan.annualPrice
              ? Math.round(plan.annualPrice / 12)
              : plan.price;

            return (
              <Card
                key={plan.id}
                className={`relative ${plan.isPopular ? 'border-primary ring-1 ring-primary' : ''} ${isCurrentPlan ? 'bg-primary/5' : ''}`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-white text-xs font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="pt-2">
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  <p className="text-xs text-muted mt-0.5">{plan.description}</p>

                  <div className="mt-4 mb-4">
                    {plan.price === 0 ? (
                      <div className="text-3xl font-bold text-foreground">Free</div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground">
                          {plan.currency} {displayPrice.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted">/mo</span>
                      </div>
                    )}
                    {billingCycle === 'annual' && plan.price > 0 && plan.annualPrice && (
                      <p className="text-xs text-muted mt-1">
                        {plan.currency} {plan.annualPrice.toLocaleString()}/year
                      </p>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-foreground">
                      <Users className="w-4 h-4 text-muted" />
                      {plan.limits.maxMembers === -1 ? 'Unlimited' : plan.limits.maxMembers} Members
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Building className="w-4 h-4 text-muted" />
                      {plan.limits.maxBranches === -1 ? 'Unlimited' : plan.limits.maxBranches} Branch{plan.limits.maxBranches !== 1 ? 'es' : ''}
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <MessageSquare className="w-4 h-4 text-muted" />
                      {plan.limits.smsCredits === 0 ? 'No' : plan.limits.smsCredits === -1 ? 'Custom' : plan.limits.smsCredits} SMS Credits
                    </div>
                  </div>

                  {/* Key Features */}
                  <div className="border-t border-border pt-3 space-y-1.5">
                    {plan.features.slice(0, 6).map((feature: any) => (
                      <div key={feature.key || feature.text} className="flex items-center gap-2">
                        {feature.included ? (
                          <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        ) : (
                          <XIcon className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0" />
                        )}
                        <span className={`text-xs ${feature.included ? 'text-foreground' : 'text-muted line-through'}`}>
                          {feature.text || feature.name}
                        </span>
                      </div>
                    ))}
                    {plan.features.length > 6 && (
                      <p className="text-xs text-muted pl-6">
                        +{plan.features.length - 6} more features
                      </p>
                    )}
                  </div>

                  <div className="mt-4">
                    <PaystackUpgradeButton
                      plan={plan}
                      billingCycle={billingCycle}
                      organization={organization}
                      userEmail={userEmail}
                      currentPlanPrice={currentPlan?.price || 0}
                      isCurrentPlan={isCurrentPlan}
                      isExpired={isExpired}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
