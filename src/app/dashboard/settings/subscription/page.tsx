'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Zap, ArrowUpRight, Info } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { useOrganizationStore } from '@/store/organizationStore';
import { subscriptionApi } from '@/lib/api';

interface UsageLimitItem {
  label: string;
  current: number;
  limit: number;
  description?: string;
}

function UsageCard({ item, icon: Icon }: { item: UsageLimitItem; icon?: React.ComponentType<{ className?: string }> }) {
  if (item.limit === -1) {
    // Unlimited
    return (
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
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

  const { data: limits, isLoading, error } = useQuery({
    queryKey: ['subscription-limits', organization?._id],
    queryFn: async () => {
      try {
        const response = await subscriptionApi.getLimits(organization?._id || '');
        console.log('[Subscription] Limits response:', response);
        return response;
      } catch (err) {
        console.error('[Subscription] Error fetching limits:', err);
        throw err;
      }
    },
    enabled: !!organization?._id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Subscription & Limits</h1>
        <p className="text-muted mt-2">View your current plan and usage limits</p>
      </div>

      {/* Plan Overview */}
      {limits && (
        <Card className="p-6 border-primary/20 bg-primary/5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{limits.planName}</h2>
              <p className="text-sm text-muted mt-1">Plan ID: {limits.planId}</p>
            </div>
            <div className="flex items-center gap-2">
              {allGood ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : (
                <AlertCircle className="w-6 h-6 text-amber-500" />
              )}
            </div>
          </div>

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

      {/* Usage Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-foreground">Usage Breakdown</h2>
          <Info className="w-4 h-4 text-muted" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-2 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-24"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-4 border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10">
            <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Unable to load subscription information
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {usageItems.map((item, idx) => (
              <UsageCard key={idx} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Upgrade Section */}
      {limits && limits.planId !== 'sanctuary' && (
        <Card className="p-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-primary" />
                Ready to grow?
              </h3>
              <p className="text-sm text-muted mt-2">
                Upgrade your plan to unlock more features and higher limits for your organization.
              </p>
            </div>
            <Button className="flex-shrink-0">
              Upgrade Plan
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
