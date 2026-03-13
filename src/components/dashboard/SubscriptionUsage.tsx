'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Settings2 } from 'lucide-react';
import { useOrganizationStore } from '@/store/organizationStore';
import { subscriptionApi } from '@/lib/api';

export default function SubscriptionUsage() {
  const { organization } = useOrganizationStore();

  const { data: limits, isLoading } = useQuery({
    queryKey: ['subscription-limits', organization?._id],
    queryFn: () => subscriptionApi.getLimits(organization?._id || ''),
    enabled: !!organization?._id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (!organization?._id) return null;

  if (isLoading) {
    return (
      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-white/10 rounded w-24"></div>
          <div className="h-2 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  if (!limits) {
    return null;
  }

  const membersCount = limits.usage?.membersCount || 0;
  const membersLimit = limits.limits?.maxMembers || 0;
  const membersPercentage = membersLimit > 0 ? Math.round((membersCount / membersLimit) * 100) : 0;
  const isAtLimit = membersPercentage >= 100;
  const isNearLimit = membersPercentage >= 80;

  return (
    <Link href="/dashboard/settings/subscription">
      <div className="bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isAtLimit ? (
                <AlertCircle className="w-4 h-4 text-red-500" />
              ) : isNearLimit ? (
                <AlertCircle className="w-4 h-4 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
              <span className="text-xs font-medium text-sidebar-foreground">Members</span>
            </div>
            <span className="text-xs text-sidebar-foreground/50">
              {membersCount}/{membersLimit}
            </span>
          </div>

          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(membersPercentage, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {isAtLimit && (
              <span className="text-xs text-red-400">Limit reached</span>
            )}
            {isNearLimit && !isAtLimit && (
              <span className="text-xs text-amber-400">{100 - membersPercentage}% remaining</span>
            )}
            {!isAtLimit && !isNearLimit && (
              <span className="text-xs text-green-400">{100 - membersPercentage}% remaining</span>
            )}
            <Settings2 className="w-3 h-3 text-sidebar-foreground/40" />
          </div>
        </div>
    </Link>
  );
}
