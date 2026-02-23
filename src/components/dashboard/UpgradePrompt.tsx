'use client';

import Link from 'next/link';
import { Lock, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui';

const FEATURE_LABELS: Record<string, string> = {
  birthday_notifications: 'Birthday Notifications',
  department_management: 'Department Management',
  event_sharing: 'Event Sharing',
  advanced_financial_reporting: 'Advanced Financial Reporting',
  event_management: 'Event Management',
  attendance_tracking: 'Attendance Tracking',
  financial_reporting: 'Financial Reporting',
};

interface UpgradePromptProps {
  featureKey: string;
  featureName?: string;
  currentPlan?: string | null;
}

export default function UpgradePrompt({
  featureKey,
  featureName,
  currentPlan,
}: UpgradePromptProps) {
  const displayName = featureName || FEATURE_LABELS[featureKey] || featureKey;

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full text-center p-8">
        <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {displayName}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          This feature is not available on your {currentPlan || 'current plan'}.
          Upgrade to unlock {displayName.toLowerCase()} and more.
        </p>
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#3AAFDC] hover:bg-[#2D9AC7] text-white font-medium rounded-lg transition-colors"
        >
          Upgrade Plan
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </Card>
    </div>
  );
}
