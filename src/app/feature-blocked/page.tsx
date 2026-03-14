'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui';
import { useOrganizationStore } from '@/store/organizationStore';

const FEATURE_DESCRIPTIONS: Record<string, { name: string; description: string }> = {
  event_management: {
    name: 'Event Management',
    description: 'Create and manage events for your church community',
  },
  attendance_tracking: {
    name: 'Attendance Tracking',
    description: 'Track member attendance at events and services',
  },
  financial_reporting: {
    name: 'Financial Reporting',
    description: 'Access detailed financial reports and insights',
  },
  advanced_financial_reporting: {
    name: 'Advanced Financial Reporting',
    description: 'Access detailed financial reports and insights',
  },
  department_management: {
    name: 'Department Management',
    description: 'Create and manage departments within your organization',
  },
  sms_credits: {
    name: 'SMS Communication',
    description: 'Send SMS messages to your congregation',
  },
  branches: {
    name: 'Multi-Branch Support',
    description: 'Manage multiple branch locations',
  },
  member_directory: {
    name: 'Member Directory',
    description: 'Access your member directory',
  },
  birthday_notifications: {
    name: 'Birthday Notifications',
    description: 'Celebrate member birthdays with automated notifications',
  },
  advanced_analytics: {
    name: 'Advanced Analytics',
    description: 'Get deeper insights into your church data',
  },
};

const PLAN_RECOMMENDATIONS: Record<string, string> = {
  seed: 'Growth',
  growth: 'Ascend',
  ascend: 'Sanctuary',
};

export default function FeatureBlockedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organization } = useOrganizationStore();

  const featureKey = searchParams.get('feature') || 'unknown_feature';
  const currentPlan = searchParams.get('plan') || 'unknown';
  const requiredPlan = searchParams.get('required') || 'Growth';

  const feature = FEATURE_DESCRIPTIONS[featureKey] || {
    name: 'Feature',
    description: 'This feature is not available on your current plan',
  };

  const recommendedPlan = PLAN_RECOMMENDATIONS[currentPlan.toLowerCase()] || 'Growth';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-foreground">Feature Locked</h1>
          <p className="text-muted">{feature.name} is not included in your current plan</p>
        </div>

        {/* Feature Details */}
        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">{feature.name}</p>
            <p className="text-sm text-muted mt-1">{feature.description}</p>
          </div>

          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">Current Plan</p>
                <p className="text-sm font-semibold text-foreground capitalize">{currentPlan}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted" />
              <div>
                <p className="text-xs text-muted">Minimum Required</p>
                <p className="text-sm font-semibold text-primary capitalize">{requiredPlan}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Link href="/dashboard/settings/subscription">
            <Button className="w-full" size="lg">
              <Zap className="w-4 h-4 mr-2" />
              Upgrade Your Plan
            </Button>
          </Link>
          <button
            onClick={() => router.back()}
            className="w-full px-4 py-2 rounded-lg border border-border text-foreground hover:bg-background transition-colors text-sm font-medium"
          >
            Go Back
          </button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/30 p-3">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Upgrade to the <strong>{recommendedPlan}</strong> plan to unlock this feature and grow your organization.
          </p>
        </div>
      </div>
    </div>
  );
}
