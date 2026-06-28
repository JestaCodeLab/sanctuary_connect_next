'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePaystackPayment } from 'react-paystack';
import { Zap, CreditCard, Check, AlertCircle, Loader2, Package, ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/dashboard';
import { Button, Card } from '@/components/ui';
import { api, smsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface SmsPackage {
  _id: string;
  name: string;
  credits: number;
  price: number;
  description?: string;
  isPopular?: boolean;
}

export default function CreditsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [processingPackageId, setProcessingPackageId] = useState<string | null>(null);
  const [paymentQuote, setPaymentQuote] = useState<any>(null);
  const shouldInitializeRef = useRef(false);

  // Fetch SMS packages
  const { data: packagesData = [], isLoading: packagesLoading, error: packagesError } = useQuery({
    queryKey: ['sms-packages'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/sms/packages');
        console.log('SMS Packages Response:', response.data);
        return response.data.packages || response.data || [];
      } catch (error) {
        console.error('Error fetching SMS packages:', error);
        throw error;
      }
    },
    retry: 2,
  });

  // Fetch current credits balance
  const { data: creditsBalance } = useQuery({
    queryKey: ['sms-credits'],
    queryFn: smsApi.getCreditsBalance,
  });

  // Initialize Paystack at component level (required for hook usage)
  // Config updates when paymentQuote state changes
  const paystackConfig = {
    reference: paymentQuote?.reference || `sms_${Date.now()}`,
    email: user?.email || '',
    amount: paymentQuote ? Math.round(paymentQuote.total * 100) : 0,
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx',
    currency: 'GHS',
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  const handlePaystackSuccess = (response: { reference: string }) => {
    const verifyPayment = async () => {
      try {
        await smsApi.verifyPayment(response.reference);
        toast.success(`Successfully purchased ${paymentQuote?.credits} SMS credits!`);
        queryClient.invalidateQueries({ queryKey: ['sms-credits'] });
        setProcessingPackageId(null);
        setPaymentQuote(null);
      } catch (error: any) {
        toast.error(error?.response?.data?.error || 'Payment verified but credit failed. Contact support.');
      }
    };
    verifyPayment();
  };

  // Trigger Paystack initialization when quote is ready
  useEffect(() => {
    if (shouldInitializeRef.current && paymentQuote) {
      shouldInitializeRef.current = false;
      initializePayment({
        onSuccess: handlePaystackSuccess,
        onClose: () => {
          setProcessingPackageId(null);
          setPaymentQuote(null);
        },
      });
    }
  }, [paymentQuote, initializePayment]);

  const handleChoosePlan = async (pkg: SmsPackage) => {
    setProcessingPackageId(pkg._id);
    try {
      // Fetch payment quote with package credits and price
      const quote = await smsApi.initializePayment(pkg.credits, pkg.price);
      // Set flag and update quote (useEffect will trigger Paystack init)
      shouldInitializeRef.current = true;
      setPaymentQuote(quote);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to process payment');
      setProcessingPackageId(null);
    }
  };

  // Sort packages by price
  const sortedPackages = [...packagesData].sort((a, b) => a.price - b.price);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <PageHeader
          title="SMS Credits"
          description="Purchase SMS credits to send messages to your members"
        />
      </div>

      {/* Current Balance */}
      <Card padding="md" className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted uppercase tracking-wide mb-1">Current Balance</p>
            <p className="text-2xl font-bold text-primary">{creditsBalance?.balance || 0}</p>
            <p className="text-xs text-muted mt-1">
              {creditsBalance?.balance === 1 ? 'credit' : 'credits'}
            </p>
          </div>
          <Zap className="w-12 h-12 text-primary/20" />
        </div>
      </Card>

      {/* Packages Section */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Available Packages
        </h3>

        {packagesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : packagesError || sortedPackages.length === 0 ? (
          <Card padding="lg" className="text-center">
            <AlertCircle className="w-12 h-12 text-muted mx-auto mb-3 opacity-50" />
            <p className="text-foreground font-medium">No packages available</p>
            <p className="text-sm text-muted mt-1">
              {packagesError ? 'Error loading packages. Please try again.' : 'Contact support to purchase SMS credits'}
            </p>
            {packagesError && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.refetchQueries({ queryKey: ['sms-packages'] })}
                className="mt-4"
              >
                Retry
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedPackages.map((pkg) => (
              <div
                key={pkg._id}
                className="relative p-4 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-muted/20 transition-all"
              >
                {pkg.isPopular && (
                  <div className="absolute -top-2 -right-2 px-2 py-1 bg-primary text-white text-xs font-bold rounded-full">
                    Popular
                  </div>
                )}

                <div className="mb-3">
                  <p className="text-xs text-muted uppercase tracking-wide mb-1 font-medium">{pkg.name}</p>
                  <p className="text-2xl font-bold text-foreground">{pkg.credits}</p>
                  <p className="text-xs text-muted">credits</p>
                </div>

                <div className="border-t border-border pt-3 mb-3">
                  <p className="text-xl font-bold text-primary">₵{pkg.price.toFixed(2)}</p>
                  <p className="text-xs text-muted">₵{(pkg.price / pkg.credits).toFixed(4)}/credit</p>
                </div>

                {pkg.description && (
                  <p className="text-xs text-muted mb-3 line-clamp-2">{pkg.description}</p>
                )}

                <Button
                  onClick={() => handleChoosePlan(pkg)}
                  disabled={processingPackageId === pkg._id}
                  isLoading={processingPackageId === pkg._id}
                  className="w-full"
                  size="sm"
                >
                  {processingPackageId === pkg._id ? 'Processing...' : 'Choose Plan'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      <Card padding="lg" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">How SMS Credits Work</h4>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <li className="flex gap-2">
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Each SMS message costs 1 credit</span>
          </li>
          <li className="flex gap-2">
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Credits are deducted when messages are sent</span>
          </li>
          <li className="flex gap-2">
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Unused credits roll over to the next billing period</span>
          </li>
          <li className="flex gap-2">
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>You can purchase credits anytime</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
