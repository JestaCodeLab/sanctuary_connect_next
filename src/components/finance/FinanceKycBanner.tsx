'use client';

import { useEffect, useState } from 'react';
import { Clock, CheckCircle, AlertCircle, X } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface FinanceAccountStatus {
  status: 'not_started' | 'pending' | 'approved' | 'rejected' | 'revoked';
  message: string;
  rejectionReason?: string;
  revokedReason?: string;
  submittedAt?: string;
}

interface FinanceKycBannerProps {
  dismissible?: boolean;
  setupPath?: string;
}

export function FinanceKycBanner({
  dismissible = true,
  setupPath = '/finance/setup'
}: FinanceKycBannerProps) {
  const [status, setStatus] = useState<FinanceAccountStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const { data } = await api.get('/api/finance/account/status');
        setStatus(data);
      } catch (err) {
        // Silently fail - banner just won't show
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, []);

  if (isLoading || isDismissed || !status || status.status === 'approved') {
    return null;
  }

  // Not started
  if (status.status === 'not_started') {
    return (
      <div className="w-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
              Finance Setup Required
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
              Complete your merchant account setup to enable payment processing and financial features.
            </p>
            <Link href={setupPath}>
              <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded transition-colors">
                Start Setup
              </button>
            </Link>
          </div>
          {dismissible && (
            <button
              onClick={() => setIsDismissed(true)}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Pending approval
  if (status.status === 'pending') {
    const submittedDate = status.submittedAt
      ? new Date(status.submittedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      : 'recently';

    return (
      <div className="w-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-4">
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
              KYC Verification Pending
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Your merchant account application was submitted on <span className="font-medium">{submittedDate}</span>.
              Our team typically completes reviews within <span className="font-medium">24-48 hours</span>.
              You'll receive an email notification once approved.
            </p>
          </div>
          {dismissible && (
            <button
              onClick={() => setIsDismissed(true)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Rejected
  if (status.status === 'rejected') {
    return (
      <div className="w-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-red-900 dark:text-red-200 mb-1">
              Application Rejected
            </h3>
            <p className="text-sm text-red-800 dark:text-red-300 mb-2">
              {status.rejectionReason || 'Your application did not meet our requirements.'}
            </p>
            <Link href={setupPath}>
              <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors">
                Resubmit Application
              </button>
            </Link>
          </div>
          {dismissible && (
            <button
              onClick={() => setIsDismissed(true)}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Revoked
  if (status.status === 'revoked') {
    return (
      <div className="w-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-red-900 dark:text-red-200 mb-1">
              Account Revoked
            </h3>
            <p className="text-sm text-red-800 dark:text-red-300">
              {status.revokedReason ? `Reason: ${status.revokedReason}. ` : ''}
              Please contact support for assistance.
            </p>
          </div>
          {dismissible && (
            <button
              onClick={() => setIsDismissed(true)}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
