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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Finance Account Setup</h1>
          <p className="mt-2 text-gray-600">
            Set up your merchant account to access the finance module
          </p>
        </div>

        <FinanceAccountSetupForm onSubmitSuccess={handleSubmitSuccess} />
      </div>
    </div>
  );
}
