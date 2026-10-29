'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { subscriptionApi } from '@/lib/api';
import { useOrganizationStore } from '@/store/organizationStore';

type Status = 'verifying' | 'success' | 'error';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const organization = useOrganizationStore((s) => s.organization);
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const [status, setStatus] = useState<Status>(reference ? 'verifying' : 'error');
  const [message, setMessage] = useState(reference ? '' : 'No payment reference found.');
  // verify-payment is idempotent server-side, but don't fire it twice from re-renders anyway
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !reference) return;
    if (!organization?._id) return; // store still hydrating; effect re-runs when it arrives

    started.current = true;
    subscriptionApi
      .verifyUpgrade(organization._id, { reference })
      .then((res) => {
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
        queryClient.invalidateQueries({ queryKey: ['subscription-limits'] });
        setMessage(res?.message || 'Your subscription has been updated.');
        setStatus('success');
        setTimeout(() => router.replace('/dashboard/settings?tab=subscription'), 2500);
      })
      .catch((err) => {
        setMessage(
          err?.response?.data?.error ||
            'We could not confirm your payment. If you were charged, please contact support with your payment reference.'
        );
        setStatus('error');
      });
  }, [reference, organization?._id, queryClient, router]);

  return (
    <div className="max-w-md mx-auto mt-16">
      <Card padding="lg">
        <div className="flex flex-col items-center text-center gap-3">
          {status === 'verifying' && (
            <>
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <h1 className="text-lg font-semibold text-foreground">Confirming your payment…</h1>
              <p className="text-sm text-muted">Please don&apos;t close this page.</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="w-10 h-10 text-green-500" />
              <h1 className="text-lg font-semibold text-foreground">Payment confirmed</h1>
              <p className="text-sm text-muted">{message}</p>
            </>
          )}
          {status === 'error' && (
            <>
              <AlertCircle className="w-10 h-10 text-red-500" />
              <h1 className="text-lg font-semibold text-foreground">Payment not confirmed</h1>
              <p className="text-sm text-muted">{message}</p>
              {reference && <p className="text-xs text-muted">Reference: {reference}</p>}
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.replace('/dashboard/settings?tab=subscription')}
              >
                Back to subscription
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function SubscriptionCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackContent />
    </Suspense>
  );
}
