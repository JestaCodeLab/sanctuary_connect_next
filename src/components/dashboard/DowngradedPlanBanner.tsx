'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Info, X } from 'lucide-react';
import { useSubscriptionStatus } from '@/lib/hooks/useSubscriptionStatus';

/**
 * Replaces the flood of per-request "feature not included" toasts a
 * downgraded org would otherwise see (one per gated widget that fails to
 * load) with a single, calm, dismiss-once-a-day notice.
 */
export function DowngradedPlanBanner() {
  const { wasDowngraded, planName } = useSubscriptionStatus();
  const [dismissed, setDismissed] = useState(true); // start hidden until we've checked localStorage, to avoid a flash

  const dismissKey = wasDowngraded ? `downgraded-banner-dismissed:${new Date().toDateString()}` : null;

  useEffect(() => {
    if (!dismissKey) return;
    try {
      setDismissed(localStorage.getItem(dismissKey) === 'true');
    } catch {
      setDismissed(false);
    }
  }, [dismissKey]);

  if (!wasDowngraded || dismissed || !dismissKey) {
    return null;
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(dismissKey, 'true');
    } catch {
      // Ignore storage errors - worst case it reappears on next render
    }
    setDismissed(true);
  };

  return (
    <div className="w-full bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800 px-4 py-3">
      <div className="flex items-start gap-3 max-w-7xl mx-auto">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
            You&apos;re currently on the {planName || 'Seed'} plan
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Some features you had before are unavailable on this plan. Upgrade anytime to restore full access.
          </p>
        </div>
        <Link
          href="/dashboard/settings?tab=subscription"
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors flex-shrink-0"
        >
          View Plans
        </Link>
        <button
          onClick={handleDismiss}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default DowngradedPlanBanner;
