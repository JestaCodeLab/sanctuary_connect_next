'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, CreditCard, BarChart3, Info, Check, X } from 'lucide-react';
import { Card } from '@/components/ui';
import { Badge } from '@/components/dashboard';
import { useOrganizationStore } from '@/store/organizationStore';
import { useAuthStore } from '@/store/authStore';
import { subscriptionApi } from '@/lib/api';
import type { SubscriptionPlanResponse } from '@/lib/api';
import SubscriptionPlansGrid from '@/components/dashboard/SubscriptionPlansGrid';

type Tab = 'plans' | 'usage';

const subscriptionStatusVariant: Record<string, 'success' | 'error' | 'warning'> = {
  active: 'success',
  cancelled: 'error',
  past_due: 'warning',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatCurrency(amount: number, curr: string = 'GHS'): string {
  return `${curr} ${amount.toLocaleString()}`;
}

interface UsageLimitItem {
  label: string;
  current: number;
  limit: number;
  description?: string;
}

function UsageCard({ item }: { item: UsageLimitItem }) {
  if (item.limit === -1) {
    // Unlimited
    return (
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div>
                <h3 className="text-sm font-medium text-foreground">{item.label}</h3>
                {item.description && (
                  <p className="text-xs text-muted mt-1">{item.description}</p>
                )}
              </div>
            </div>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-500/20 px-2.5 py-1 rounded-full">
              Unlimited
            </span>
          </div>
        </div>
      </Card>
    );
  }

  const percentage = Math.round((item.current / item.limit) * 100);
  const isAtLimit = percentage >= 100;
  const isNearLimit = percentage >= 80;

  const statusConfig = isAtLimit
    ? { color: 'red', bgColor: 'bg-red-50 dark:bg-red-500/20', borderColor: 'border-red-200 dark:border-red-500/30', barColor: 'bg-red-500', textColor: 'text-red-600' }
    : isNearLimit
      ? { color: 'amber', bgColor: 'bg-amber-50 dark:bg-amber-500/20', borderColor: 'border-amber-200 dark:border-amber-500/30', barColor: 'bg-amber-500', textColor: 'text-amber-600' }
      : { color: 'green', bgColor: 'bg-green-50 dark:bg-green-500/20', borderColor: 'border-green-200 dark:border-green-500/30', barColor: 'bg-green-500', textColor: 'text-green-600' };

  return (
    <Card className={`p-4 border ${statusConfig.borderColor}`}>
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {isAtLimit ? (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            ) : isNearLimit ? (
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h3 className="text-sm font-medium text-foreground">{item.label}</h3>
              {item.description && (
                <p className="text-xs text-muted mt-1">{item.description}</p>
              )}
            </div>
          </div>
          <span className={`text-sm font-semibold ${statusConfig.textColor} ${statusConfig.bgColor} px-2.5 py-1 rounded-full`}>
            {item.current}/{item.limit}
          </span>
        </div>

        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${statusConfig.barColor} transition-all`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        <div className="text-xs text-muted">{percentage}% used</div>

        {isAtLimit && (
          <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded border border-red-200 dark:border-red-500/20 text-xs text-red-700 dark:text-red-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Limit reached. Consider upgrading your plan.</span>
          </div>
        )}
        {isNearLimit && !isAtLimit && (
          <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded border border-amber-200 dark:border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Approaching limit ({100 - percentage}% remaining)</span>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function SubscriptionPage() {
  const { organization } = useOrganizationStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('plans');

  const { data: limits, isLoading, error } = useQuery({
    queryKey: ['subscription-limits', organization?._id],
    queryFn: () => subscriptionApi.getLimits(organization?._id || ''),
    enabled: !!organization?._id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: subscriptionData, isLoading: isSubLoading } = useQuery({
    queryKey: ['subscription', organization?._id],
    queryFn: () => subscriptionApi.get(organization!._id),
    enabled: !!organization?._id,
  });

  const { data: allPlans = [] } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: subscriptionApi.getPlans,
  });

  const sub = subscriptionData?.subscription as any;
  const currentPlan = allPlans.find((p: SubscriptionPlanResponse) => p.id === sub?.planId);

  const usageItems: UsageLimitItem[] = limits
    ? [
        {
          label: 'Members',
          current: limits.usage?.membersCount ?? 0,
          limit: limits.limits?.maxMembers ?? 0,
          description: 'Total members in your organization',
        },
        {
          label: 'Branches',
          current: limits.usage?.branchesCount ?? 0,
          limit: limits.limits?.maxBranches ?? 0,
          description: 'Number of branches/locations',
        },
        {
          label: 'Departments',
          current: limits.usage?.departmentsCount ?? 0,
          limit: limits.limits?.maxDepartments ?? 0,
          description: 'Departments in your organization',
        },
        {
          label: 'Events',
          current: limits.usage?.eventsCount ?? 0,
          limit: limits.limits?.maxEvents ?? 0,
          description: 'Events you can create',
        },
        {
          label: 'SMS Credits',
          current: limits.usage?.smsUsed ?? 0,
          limit: limits.limits?.smsCredits ?? 0,
          description: 'Monthly SMS messages',
        },
        {
          label: 'Donations',
          current: limits.usage?.donationTransactions ?? 0,
          limit: limits.limits?.donationTransactions ?? 0,
          description: 'Monthly donation transactions',
        },
      ]
    : [];

  const allGood = limits && limits.withinLimits.members && limits.withinLimits.branches && limits.withinLimits.sms && limits.withinLimits.transactions;
  const hasWarnings = limits && (!limits.withinLimits.members || !limits.withinLimits.branches || !limits.withinLimits.sms || !limits.withinLimits.transactions);

  const tabs: { id: Tab; label: string; icon: typeof CreditCard }[] = [
    { id: 'plans', label: 'Plans', icon: CreditCard },
    { id: 'usage', label: 'Usage', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Subscription & Limits</h1>
        <p className="text-muted mt-2">View all available plans and your current usage limits</p>
      </div>

      {/* Current Plan Summary */}
      {limits && (
        <Card className="p-6 border-primary/20 bg-primary/5">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{limits.planName}</h2>
              <p className="text-sm text-muted mt-1">Your subscription details and usage</p>
            </div>
            <div className="flex items-center gap-2">
              {sub && (
                <Badge variant={subscriptionStatusVariant[sub.status] || 'muted'}>
                  {sub.status.charAt(0).toUpperCase() + sub.status.slice(1).replace('_', ' ')}
                </Badge>
              )}
              {allGood ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : (
                <AlertCircle className="w-6 h-6 text-amber-500" />
              )}
            </div>
          </div>

          {sub && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-background rounded-lg p-4 border border-border">
                <p className="text-xs text-muted uppercase tracking-wider">Plan</p>
                <p className="text-lg font-bold text-foreground mt-1">
                  {currentPlan?.name || sub.planId}
                </p>
              </div>
              <div className="bg-background rounded-lg p-4 border border-border">
                <p className="text-xs text-muted uppercase tracking-wider">Price</p>
                <p className="text-lg font-bold text-foreground mt-1">
                  {currentPlan ? (
                    currentPlan.price === 0 ? 'Free' : formatCurrency(
                      sub.billingCycle === 'annual' ? currentPlan.annualPrice : currentPlan.price,
                      currentPlan.currency
                    ) + (sub.billingCycle === 'annual' ? '/yr' : '/mo')
                  ) : '—'}
                </p>
                {currentPlan && currentPlan.price > 0 && (
                  <p className="text-xs text-muted mt-0.5">
                    Billed {sub.billingCycle}
                  </p>
                )}
              </div>
              <div className="bg-background rounded-lg p-4 border border-border">
                <p className="text-xs text-muted uppercase tracking-wider">Billing Cycle</p>
                <p className="text-lg font-bold text-foreground mt-1 capitalize">{sub.billingCycle}</p>
              </div>
              <div className="bg-background rounded-lg p-4 border border-border">
                <p className="text-xs text-muted uppercase tracking-wider">Next Billing</p>
                <p className="text-sm font-semibold text-foreground mt-1">
                  {formatDate(sub.currentPeriodEnd)}
                </p>
              </div>
            </div>
          )}

          {hasWarnings && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/30 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Usage Alert</p>
                <p className="text-xs mt-1">You're approaching or have reached some usage limits. Upgrade your plan to continue growing.</p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-background'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <Card padding="lg">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </Card>
      ) : error ? (
        <Card className="p-4 border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10">
          <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Unable to load subscription information
          </p>
        </Card>
      ) : (
        <>
          {/* Tab: Plans */}
          {activeTab === 'plans' && (
            <SubscriptionPlansGrid
              organization={organization}
              currentPlanId={limits?.planId}
              userEmail={user?.email || ''}
            />
          )}

          {/* Tab: Usage */}
          {activeTab === 'usage' && (
            <div className="space-y-6">
              {/* Usage Grid */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Usage Breakdown</h2>
                  <div className="group relative cursor-help">
                    <Info className="w-4 h-4 text-muted hover:text-foreground transition-colors" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-foreground text-background text-xs rounded-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      Current usage vs plan limits
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-foreground"></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {usageItems.map((item, idx) => (
                    <UsageCard key={idx} item={item} />
                  ))}
                </div>
              </div>

              {/* Features Section */}
              {limits && (limits as any).planFeatures && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-semibold text-foreground">Plan Features</h2>
                    <div className="group relative cursor-help">
                      <Info className="w-4 h-4 text-muted hover:text-foreground transition-colors" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-foreground text-background text-xs rounded-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        Features included in your plan
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-foreground"></div>
                      </div>
                    </div>
                  </div>

                  <Card className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(limits as any).planFeatures.map((feature: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-background hover:bg-muted/50 transition-colors">
                          {feature.included ? (
                            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <X className="w-5 h-5 text-muted flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${feature.included ? 'text-foreground' : 'text-muted'}`}>
                              {feature.name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Billing History */}
      <Card>
        <h2 className="text-lg font-semibold text-foreground mb-1">Billing History</h2>
        <p className="text-sm text-muted mb-4">View your past invoices and payments.</p>
        {isSubLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sub?.paymentHistory && sub.paymentHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-xs text-muted font-medium">Date</th>
                  <th className="text-left py-2 text-xs text-muted font-medium">Type</th>
                  <th className="text-left py-2 text-xs text-muted font-medium">Plan</th>
                  <th className="text-left py-2 text-xs text-muted font-medium">Channel</th>
                  <th className="text-right py-2 text-xs text-muted font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sub.paymentHistory.map((payment: any, idx: number) => (
                  <tr key={payment.reference || idx} className="border-b border-border last:border-0">
                    <td className="py-3 text-foreground">
                      {payment.paidAt ? formatDate(payment.paidAt) : '—'}
                    </td>
                    <td className="py-3">
                      <Badge variant={payment.type === 'upgrade' ? 'info' : payment.type === 'initial' ? 'success' : 'muted'}>
                        {payment.type?.charAt(0).toUpperCase() + payment.type?.slice(1) || 'Payment'}
                      </Badge>
                    </td>
                    <td className="py-3 text-foreground capitalize">{payment.planId || '—'}</td>
                    <td className="py-3 text-muted capitalize">{payment.channel || '—'}</td>
                    <td className="py-3 text-right font-medium text-foreground">
                      {formatCurrency(payment.amount, payment.currency || 'GHS')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6">
            <CreditCard className="w-10 h-10 text-muted mx-auto mb-2" />
            <p className="text-sm text-muted">No billing history available yet.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
