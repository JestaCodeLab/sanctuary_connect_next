'use client';

import { useRouter } from 'next/navigation';
import { FinanceAccountSetupForm } from '@/components/finance/FinanceAccountSetupForm';

export default function FinanceSetupPage() {
  const router = useRouter();

  const handleSubmitSuccess = (data: any) => {
    // Show success and redirect to finance dashboard after a delay
    setTimeout(() => {
      router.push('/dashboard?tab=finance');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/dashboard/finance')}
              className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Finance
            </button>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Finance Account Setup</h1>
          <p className="mt-2 text-muted">
            Set up your merchant account to access the finance module
          </p>
        </div>

        <FinanceAccountSetupForm onSubmitSuccess={handleSubmitSuccess} />
      </div>
    </div>
  );
}
