'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, X } from 'lucide-react';
import { useSubscriptionStatus } from '@/lib/hooks/useSubscriptionStatus';

export function SubscriptionRenewalBanner() {
  const { showRenewalBanner, inGracePeriod, daysRemaining, planName, currentPeriodEnd } = useSubscriptionStatus();
  const [dismissed, setDismissed] = useState(true); // start hidden until we've checked localStorage, to avoid a flash

  // Re-shows once a day (and immediately if the phase changes from "expiring
  // soon" to "grace period", since that's a more urgent state) rather than
  // being dismissible for the whole remaining window.
  const dismissKey = currentPeriodEnd
    ? `subscription-banner-dismissed:${currentPeriodEnd}:${inGracePeriod ? 'grace' : 'soon'}:${new Date().toDateString()}`
    : null;

  useEffect(() => {
    if (!dismissKey) return;
    try {
      setDismissed(localStorage.getItem(dismissKey) === 'true');
    } catch {
      setDismissed(false);
    }
  }, [dismissKey]);

  if (!showRenewalBanner || dismissed || !dismissKey) {
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

  const colors = inGracePeriod
    ? {
        bg: 'bg-red-50 dark:bg-red-950/30',
        border: 'border-red-200 dark:border-red-800',
        icon: 'text-red-600 dark:text-red-400',
        title: 'text-red-900 dark:text-red-200',
        text: 'text-red-800 dark:text-red-300',
        button: 'bg-red-600 hover:bg-red-700',
        close: 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300',
      }
    : {
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-200 dark:border-amber-800',
        icon: 'text-amber-600 dark:text-amber-500',
        title: 'text-amber-900 dark:text-amber-200',
        text: 'text-amber-800 dark:text-amber-300',
        button: 'bg-amber-600 hover:bg-amber-700',
        close: 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300',
      };

  return (
    <div className={`w-full ${colors.bg} border-b ${colors.border} px-4 py-3`}>
      <div className="flex items-start gap-3 max-w-7xl mx-auto">
        <AlertTriangle className={`w-5 h-5 ${colors.icon} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${colors.title}`}>
            {inGracePeriod
              ? `${planName || 'Your plan'} has expired`
              : `${planName || 'Your plan'} expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`}
          </p>
          <p className={`text-sm ${colors.text}`}>
            {inGracePeriod
              ? `You have ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left before your organization is switched to the free Seed plan.`
              : 'Renew now to avoid any interruption to your plan\'s features.'}
          </p>
        </div>
        <Link
          href="/dashboard/settings?tab=subscription"
          className={`inline-flex items-center gap-2 px-3 py-1.5 ${colors.button} text-white text-sm font-medium rounded transition-colors flex-shrink-0`}
        >
          Renew Now
        </Link>
        <button
          onClick={handleDismiss}
          className={`${colors.close} flex-shrink-0`}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default SubscriptionRenewalBanner;
