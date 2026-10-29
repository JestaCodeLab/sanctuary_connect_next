'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Users, Building, MessageSquare, Check, X as XIcon, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { subscriptionApi } from '@/lib/api';
import type { SubscriptionPlanResponse, SubscriptionQuote } from '@/lib/api';

const money = (currency: string, n: number) =>
  `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function PaystackUpgradeButton({
  plan,
  billingCycle,
  organization,
  currentPlanPrice,
  currentBillingCycle,
  isCurrentPlan,
  isExpired,
}: {
  plan: SubscriptionPlanResponse;
  billingCycle: 'monthly' | 'annual';
  organization: any;
  currentPlanPrice: number;
  currentBillingCycle?: 'monthly' | 'annual';
  isCurrentPlan: boolean;
  isExpired: boolean;
}) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const [quote, setQuote] = useState<SubscriptionQuote | null>(null);

  const isUpgrade = plan.price > currentPlanPrice;
  const isDowngrade = plan.price < currentPlanPrice;
  // Same plan, but the org is on monthly and is looking at the annual toggle (or vice versa)
  const isCycleChange = isCurrentPlan && !isExpired && !!currentBillingCycle && currentBillingCycle !== billingCycle;

  const downgradeMutation = useMutation({
    // Cycle is deliberately not sent: a downgrade keeps the paid period and cycle as-is.
    mutationFn: () => subscriptionApi.update(organization._id, { planId: plan.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-limits'] });
      toast.success(`Switched to ${plan.name}`);
      setShowDowngradeConfirm(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to change plan');
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

  // Step 1: ask the server what this purchase costs (discount + credit for unused time)
  const requestQuote = async () => {
    setIsProcessing(true);
    try {
      setQuote(await subscriptionApi.getQuote(organization._id, { planId: plan.id, billingCycle }));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not calculate price');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 2: server initializes Paystack with exactly the quoted amount; we redirect.
  // /dashboard/subscription/callback verifies the payment when Paystack sends them back.
  const confirmAndPay = async () => {
    setIsProcessing(true);
    try {
      const init = await subscriptionApi.initializePayment(organization._id, { planId: plan.id, billingCycle });
      window.location.href = init.authorization_url;
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to start payment');
      setIsProcessing(false);
    }
  };

  const handleRenewClick = () => {
    if (plan.price === 0) {
      setIsProcessing(true);
      renewMutation.mutate();
      return;
    }
    requestQuote();
  };

  const handleUpgradeClick = () => {
    if (plan.price === 0 || isDowngrade) {
      setShowDowngradeConfirm(true);
      return;
    }
    requestQuote();
  };

  const quoteModal = quote && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {isExpired && isCurrentPlan ? 'Renew' : isCycleChange ? 'Change billing cycle' : 'Confirm'} — {plan.name}
        </h3>
        <p className="text-sm text-muted mb-4 capitalize">{quote.billingCycle} billing</p>

        <dl className="text-sm space-y-2 border-t border-border pt-4">
          <div className="flex justify-between">
            <dt className="text-muted">{plan.name} ({quote.billingCycle})</dt>
            <dd className="text-foreground">{money(quote.currency, quote.listPrice ?? quote.price)}</dd>
          </div>
          {quote.discount && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <dt>{quote.discount.name}</dt>
              <dd>−{money(quote.currency, quote.discount.amountOff)}</dd>
            </div>
          )}
          {quote.credit > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <dt>Credit for unused time on current plan</dt>
              <dd>−{money(quote.currency, quote.credit)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">Tax ({Math.round(quote.taxRate * 100)}%)</dt>
            <dd className="text-foreground">{money(quote.currency, quote.taxAmount)}</dd>
          </div>
          <div className="flex justify-between pt-2 border-t border-border font-semibold">
            <dt className="text-foreground">Total due</dt>
            <dd className="text-foreground">{money(quote.currency, quote.total)}</dd>
          </div>
        </dl>

        <p className="text-xs text-muted mt-4">
          Your {quote.billingCycle === 'annual' ? 'year' : 'month'} starts today and renews on{' '}
          {new Date(quote.periodEnd).toLocaleDateString()}.
        </p>

        <div className="flex gap-3 justify-end mt-6">
          <Button variant="outline" size="sm" onClick={() => setQuote(null)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" isLoading={isProcessing} onClick={confirmAndPay}>
            Pay {money(quote.currency, quote.total)}
          </Button>
        </div>
      </div>
    </div>
  );

  if (isCurrentPlan && !isCycleChange) {
    if (isExpired) {
      return (
        <>
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={handleRenewClick}
            isLoading={isProcessing || renewMutation.isPending}
          >
            Renew
          </Button>
          {quoteModal}
        </>
      );
    }
    return (
      <Button variant="outline" size="sm" className="w-full" disabled>
        Current Plan
      </Button>
    );
  }

  // Moving a paid plan from annual back to monthly takes effect at renewal; nothing to buy now.
  if (isCycleChange && billingCycle === 'monthly') {
    return (
      <Button variant="outline" size="sm" className="w-full" disabled>
        Current Plan (annual)
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
        {isCycleChange ? 'Switch to Annual' : isUpgrade ? 'Upgrade' : plan.price === 0 ? 'Downgrade' : 'Switch Plan'}
        <ArrowRight className="w-4 h-4 ml-1" />
      </Button>

      {quoteModal}

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
            <p className="text-sm text-muted mb-6">
              Your plan will change immediately. You may lose access to premium features, and the
              remaining time you've already paid for is not refunded.
            </p>
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
  currentBillingCycle,
  currentPeriodEnd,
}: {
  organization: any;
  currentPlanId?: string;
  currentBillingCycle?: 'monthly' | 'annual';
  currentPeriodEnd?: string | Date;
  userEmail?: string;
}) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const isExpired = currentPeriodEnd ? new Date(currentPeriodEnd) < new Date() : false;

  const { data: allPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: subscriptionApi.getPlans,
  });

  const currentPlan = allPlans.find((p: SubscriptionPlanResponse) => p.id === currentPlanId);

  // Headline saving for the toggle, derived from real active discounts (none -> no badge)
  const bestAnnualSavingPct = allPlans.reduce((best: number, p: SubscriptionPlanResponse) => {
    if (!p.annualListPrice || p.annualPrice == null || p.annualListPrice <= 0) return best;
    return Math.max(best, Math.round((1 - p.annualPrice / p.annualListPrice) * 100));
  }, 0);

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
            {bestAnnualSavingPct > 0 && (
              <span className="ml-1 text-green-600 dark:text-green-400">Save up to {bestAnnualSavingPct}%</span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {allPlans
          .filter((plan: SubscriptionPlanResponse) => plan.price !== null)
          .map((plan: SubscriptionPlanResponse) => {
            const isCurrentPlan = plan.id === currentPlanId;
            const isAnnual = billingCycle === 'annual';
            const perMonth = isAnnual
              ? (plan.annualPrice ?? 0) / 12
              : (plan.effectiveMonthlyPrice ?? plan.price);
            const displayPrice = Math.round(perMonth * 100) / 100;
            const discount = isAnnual ? plan.annualDiscount : plan.monthlyDiscount;

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
                    {isAnnual && plan.price > 0 && plan.annualPrice != null && (
                      <p className="text-xs text-muted mt-1">
                        {discount && plan.annualListPrice != null && (
                          <span className="line-through mr-1">{plan.currency} {plan.annualListPrice.toLocaleString()}</span>
                        )}
                        {plan.currency} {plan.annualPrice.toLocaleString()}/year
                      </p>
                    )}
                    {!isAnnual && discount && plan.price > 0 && (
                      <p className="text-xs text-muted mt-1">
                        <span className="line-through mr-1">{plan.currency} {plan.price.toLocaleString()}</span>
                      </p>
                    )}
                    {discount && (
                      <span className="inline-block mt-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                        {discount.name}
                      </span>
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
                      currentPlanPrice={currentPlan?.price || 0}
                      currentBillingCycle={currentBillingCycle}
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
