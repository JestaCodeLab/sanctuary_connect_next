'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Settings, Building2, User, CreditCard, Save, Upload, Image as ImageIcon, Check, X as XIcon, Users, Building, MessageSquare, ArrowRight, BarChart3, Wallet, AlertTriangle } from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { PageHeader, Badge } from '@/components/dashboard';
import { Button, Input, Card, Select } from '@/components/ui';
import { organizationApi, subscriptionApi } from '@/lib/api';
import type { SubscriptionPlanResponse } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useOrganizationStore } from '@/store/organizationStore';

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx';
const TAX_RATE = 0.1;

type Tab = 'profile' | 'account' | 'subscription';

const currencyOptions = [
  { value: 'GHS', label: 'GHS - Ghanaian Cedi' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'NGN', label: 'NGN - Nigerian Naira' },
];

const roleBadgeVariant: Record<string, 'info' | 'success' | 'muted'> = {
  admin: 'info',
  pastor: 'success',
  staff: 'muted',
  member: 'muted',
};

const subscriptionStatusVariant: Record<string, 'success' | 'error' | 'warning'> = {
  active: 'success',
  cancelled: 'error',
  past_due: 'warning',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatCurrency(amount: number, curr: string = 'GHS'): string {
  return `${curr} ${amount.toLocaleString()}`;
}

function UsageCard({
  icon: Icon,
  label,
  used,
  max,
}: {
  icon: typeof Users;
  label: string;
  used: number;
  max: number;
}) {
  const isUnlimited = max === -1;
  const percentage = isUnlimited ? 0 : max <= 0 ? 0 : Math.min((used / max) * 100, 100);
  const isWarning = !isUnlimited && percentage > 70;
  const isDanger = !isUnlimited && percentage > 90;

  return (
    <div className="bg-background rounded-xl border border-border p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
          isDanger ? 'bg-red-100 dark:bg-red-900/30' :
          isWarning ? 'bg-amber-100 dark:bg-amber-900/30' :
          'bg-primary/10'
        }`}>
          <Icon className={`w-4.5 h-4.5 ${
            isDanger ? 'text-red-600 dark:text-red-400' :
            isWarning ? 'text-amber-600 dark:text-amber-400' :
            'text-primary'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
        </div>
      </div>
      <div className="flex items-end justify-between mb-2">
        <span className="text-2xl font-bold text-foreground">{used.toLocaleString()}</span>
        <span className="text-sm text-muted">
          {isUnlimited ? 'Unlimited' : `of ${max.toLocaleString()}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-primary'
            }`}
            style={{ width: `${Math.max(percentage, 2)}%` }}
          />
        </div>
      )}
      {isUnlimited && (
        <div className="h-1.5 bg-primary/20 rounded-full" />
      )}
    </div>
  );
}

function PaystackUpgradeButton({
  plan,
  billingCycle,
  organization,
  userEmail,
  currentPlanPrice,
  isCurrentPlan,
}: {
  plan: SubscriptionPlanResponse;
  billingCycle: 'monthly' | 'annual';
  organization: any;
  userEmail: string;
  currentPlanPrice: number;
  isCurrentPlan: boolean;
}) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);

  const isUpgrade = plan.price > currentPlanPrice;
  const isDowngrade = plan.price < currentPlanPrice;

  const planPrice = billingCycle === 'annual' && plan.annualPrice ? plan.annualPrice : plan.price;
  const totalWithTax = Math.round(planPrice * (1 + TAX_RATE));
  const amountInPesewas = totalWithTax * 100;

  const config = {
    reference: `upgrade_${organization._id}_${plan.id}_${Date.now()}`,
    email: userEmail,
    amount: amountInPesewas,
    currency: 'GHS',
    publicKey: PAYSTACK_PUBLIC_KEY,
    metadata: {
      custom_fields: [
        { display_name: 'Organization', variable_name: 'organization_id', value: organization._id },
        { display_name: 'Plan', variable_name: 'plan_id', value: plan.id },
        { display_name: 'Billing Cycle', variable_name: 'billing_cycle', value: billingCycle },
      ],
    },
  };

  const initializePayment = usePaystackPayment(config);

  const downgradeMutation = useMutation({
    mutationFn: () =>
      subscriptionApi.update(organization._id, { planId: plan.id, billingCycle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast.success(`Downgraded to ${plan.name}`);
      setShowDowngradeConfirm(false);
    },
    onError: () => {
      toast.error('Failed to change plan');
    },
  });

  const handleUpgradeClick = () => {
    if (plan.price === 0) {
      // Downgrade to free — show confirmation
      setShowDowngradeConfirm(true);
      return;
    }

    if (isDowngrade) {
      setShowDowngradeConfirm(true);
      return;
    }

    // Upgrade — trigger Paystack payment
    setIsProcessing(true);
    initializePayment({
      onSuccess: async (response: { reference: string }) => {
        try {
          await subscriptionApi.verifyUpgrade(organization._id, {
            reference: response.reference,
            planId: plan.id,
            billingCycle,
          });
          queryClient.invalidateQueries({ queryKey: ['subscription'] });
          toast.success(`Upgraded to ${plan.name}!`);
        } catch {
          toast.error('Payment received but verification failed. Please contact support.');
        } finally {
          setIsProcessing(false);
        }
      },
      onClose: () => {
        setIsProcessing(false);
      },
    });
  };

  if (isCurrentPlan) {
    return (
      <Button variant="outline" size="sm" className="w-full" disabled>
        Current Plan
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={plan.isPopular ? 'primary' : 'outline'}
        size="sm"
        className="w-full"
        onClick={handleUpgradeClick}
        isLoading={isProcessing || downgradeMutation.isPending}
      >
        {isUpgrade ? 'Upgrade' : plan.price === 0 ? 'Downgrade' : 'Switch Plan'}
        <ArrowRight className="w-4 h-4 ml-1" />
      </Button>

      {/* Downgrade Confirmation Modal */}
      {showDowngradeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Confirm Downgrade</h3>
            </div>
            <p className="text-sm text-muted mb-2">
              Are you sure you want to switch to <strong>{plan.name}</strong>?
            </p>
            {plan.price === 0 ? (
              <p className="text-sm text-muted mb-6">
                Your plan will change immediately. You may lose access to premium features.
              </p>
            ) : (
              <p className="text-sm text-muted mb-6">
                Your plan will change at the end of your current billing period.
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowDowngradeConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={downgradeMutation.isPending}
                onClick={() => downgradeMutation.mutate()}
              >
                Confirm Downgrade
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SubscriptionTab({
  organization,
  subscriptionData,
  isSubscriptionLoading,
  isSubscriptionError,
}: {
  organization: any;
  subscriptionData: any;
  isSubscriptionLoading: boolean;
  isSubscriptionError: boolean;
}) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const { user } = useAuthStore();

  const { data: allPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: subscriptionApi.getPlans,
  });

  const currentPlanId = subscriptionData?.subscription?.planId;
  const currentPlan = allPlans.find((p: SubscriptionPlanResponse) => p.id === currentPlanId);
  const sub = subscriptionData?.subscription;

  if (isSubscriptionLoading || plansLoading) {
    return (
      <Card padding="lg">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Summary */}
      <Card>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Current Plan</h2>
            <p className="text-sm text-muted mt-0.5">Your subscription details and usage</p>
          </div>
          {sub && (
            <Badge variant={subscriptionStatusVariant[sub.status] || 'muted'}>
              {sub.status.charAt(0).toUpperCase() + sub.status.slice(1).replace('_', ' ')}
            </Badge>
          )}
        </div>

        {isSubscriptionError || !sub ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-foreground font-medium">No active subscription</p>
            <p className="text-sm text-muted mt-1">Choose a plan below to get started.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-background rounded-lg p-4 border border-border">
                <p className="text-xs text-muted uppercase tracking-wider">Plan</p>
                <p className="text-lg font-bold text-foreground mt-1">
                  {currentPlan?.name || sub.planId}
                </p>
              </div>
              <div className="bg-background rounded-lg p-4 border border-border">
                <p className="text-xs text-muted uppercase tracking-wider">Price</p>
                <p className="text-lg font-bold text-foreground mt-1">
                  {currentPlan ? (
                    currentPlan.price === 0 ? 'Free' : formatCurrency(
                      sub.billingCycle === 'annual' ? currentPlan.annualPrice : currentPlan.price,
                      currentPlan.currency
                    ) + (sub.billingCycle === 'annual' ? '/yr' : '/mo')
                  ) : '—'}
                </p>
                {currentPlan && currentPlan.price > 0 && (
                  <p className="text-xs text-muted mt-0.5">
                    Billed {sub.billingCycle}
                  </p>
                )}
              </div>
              <div className="bg-background rounded-lg p-4 border border-border">
                <p className="text-xs text-muted uppercase tracking-wider">Billing Cycle</p>
                <p className="text-lg font-bold text-foreground mt-1 capitalize">{sub.billingCycle}</p>
              </div>
              <div className="bg-background rounded-lg p-4 border border-border">
                <p className="text-xs text-muted uppercase tracking-wider">Next Billing</p>
                <p className="text-sm font-semibold text-foreground mt-1">
                  {formatDate(sub.currentPeriodEnd)}
                </p>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Available Plans */}
      {allPlans.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Available Plans</h2>
              <p className="text-sm text-muted">Compare plans and upgrade your subscription</p>
            </div>

            {/* Billing Cycle Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-white dark:bg-gray-700 text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  billingCycle === 'annual'
                    ? 'bg-white dark:bg-gray-700 text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Annual
                <span className="ml-1 text-green-600 dark:text-green-400">Save 17%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {allPlans
              .filter((plan: SubscriptionPlanResponse) => plan.price !== null)
              .map((plan: SubscriptionPlanResponse) => {
                const isCurrentPlan = plan.id === currentPlanId;
                const displayPrice = billingCycle === 'annual' && plan.annualPrice
                  ? Math.round(plan.annualPrice / 12)
                  : plan.price;

                return (
                  <Card
                    key={plan.id}
                    className={`relative ${plan.isPopular ? 'border-primary ring-1 ring-primary' : ''} ${isCurrentPlan ? 'bg-primary/5' : ''}`}
                  >
                    {plan.isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-primary text-white text-xs font-medium px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}
                    <div className="pt-2">
                      <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                      <p className="text-xs text-muted mt-0.5">{plan.description}</p>

                      <div className="mt-4 mb-4">
                        {plan.price === 0 ? (
                          <div className="text-3xl font-bold text-foreground">Free</div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-foreground">
                              {plan.currency} {displayPrice.toLocaleString()}
                            </span>
                            <span className="text-sm text-muted">/mo</span>
                          </div>
                        )}
                        {billingCycle === 'annual' && plan.price > 0 && plan.annualPrice && (
                          <p className="text-xs text-muted mt-1">
                            {plan.currency} {plan.annualPrice.toLocaleString()}/year
                          </p>
                        )}
                      </div>

                      {/* Limits */}
                      <div className="space-y-2 mb-4 text-sm">
                        <div className="flex items-center gap-2 text-foreground">
                          <Users className="w-4 h-4 text-muted" />
                          {plan.limits.maxMembers === -1 ? 'Unlimited' : plan.limits.maxMembers} Members
                        </div>
                        <div className="flex items-center gap-2 text-foreground">
                          <Building className="w-4 h-4 text-muted" />
                          {plan.limits.maxBranches === -1 ? 'Unlimited' : plan.limits.maxBranches} Branch{plan.limits.maxBranches !== 1 ? 'es' : ''}
                        </div>
                        <div className="flex items-center gap-2 text-foreground">
                          <MessageSquare className="w-4 h-4 text-muted" />
                          {plan.limits.smsCredits === 0 ? 'No' : plan.limits.smsCredits === -1 ? 'Custom' : plan.limits.smsCredits} SMS Credits
                        </div>
                      </div>

                      {/* Key Features */}
                      <div className="border-t border-border pt-3 space-y-1.5">
                        {plan.features.slice(0, 6).map((feature: any) => (
                          <div key={feature.key || feature.text} className="flex items-center gap-2">
                            {feature.included ? (
                              <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            ) : (
                              <XIcon className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0" />
                            )}
                            <span className={`text-xs ${feature.included ? 'text-foreground' : 'text-muted line-through'}`}>
                              {feature.text || feature.name}
                            </span>
                          </div>
                        ))}
                        {plan.features.length > 6 && (
                          <p className="text-xs text-muted pl-6">
                            +{plan.features.length - 6} more features
                          </p>
                        )}
                      </div>

                      <div className="mt-4">
                        <PaystackUpgradeButton
                          plan={plan}
                          billingCycle={billingCycle}
                          organization={organization}
                          userEmail={user?.email || ''}
                          currentPlanPrice={currentPlan?.price || 0}
                          isCurrentPlan={isCurrentPlan}
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* Billing History */}
      <Card>
        <h2 className="text-lg font-semibold text-foreground mb-1">Billing History</h2>
        <p className="text-sm text-muted mb-4">View your past invoices and payments.</p>
        {sub?.paymentHistory && sub.paymentHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-xs text-muted font-medium">Date</th>
                  <th className="text-left py-2 text-xs text-muted font-medium">Type</th>
                  <th className="text-left py-2 text-xs text-muted font-medium">Plan</th>
                  <th className="text-left py-2 text-xs text-muted font-medium">Channel</th>
                  <th className="text-right py-2 text-xs text-muted font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sub.paymentHistory.map((payment: any, idx: number) => (
                  <tr key={payment.reference || idx} className="border-b border-border last:border-0">
                    <td className="py-3 text-foreground">
                      {payment.paidAt ? formatDate(payment.paidAt) : '—'}
                    </td>
                    <td className="py-3">
                      <Badge variant={payment.type === 'upgrade' ? 'info' : payment.type === 'initial' ? 'success' : 'muted'}>
                        {payment.type?.charAt(0).toUpperCase() + payment.type?.slice(1) || 'Payment'}
                      </Badge>
                    </td>
                    <td className="py-3 text-foreground capitalize">{payment.planId || '—'}</td>
                    <td className="py-3 text-muted capitalize">{payment.channel || '—'}</td>
                    <td className="py-3 text-right font-medium text-foreground">
                      {formatCurrency(payment.amount / 100, payment.currency || 'GHS')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6">
            <CreditCard className="w-10 h-10 text-muted mx-auto mb-2" />
            <p className="text-sm text-muted">No billing history available yet.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { setOrganization, setCurrency: setStoreCurrency } = useOrganizationStore();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for church profile
  const [churchName, setChurchName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [currency, setCurrency] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');

  // Fetch organization data
  const { data: orgData, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: () => organizationApi.getMyOrganization(),
  });
  const organization = orgData?.organization;

  // Fetch subscription data
  const {
    data: subscriptionData,
    isLoading: isSubscriptionLoading,
    isError: isSubscriptionError,
  } = useQuery({
    queryKey: ['subscription', organization?._id],
    queryFn: () => subscriptionApi.get(organization!._id),
    enabled: activeTab === 'subscription' && !!organization?._id,
  });

  // Initialize form fields from org data
  useEffect(() => {
    if (organization) {
      setChurchName(organization.churchName || '');
      setLegalName(organization.legalName || '');
      setCurrency(organization.currency || '');
      setLogoUrl(organization.logoUrl || '');
      setLogoPreview(organization.logoUrl || '');
      setOrganization(organization);
    }
  }, [organization, setOrganization]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: { churchName: string; legalName: string; currency: string; logoUrl: string }) =>
      organizationApi.update(organization!._id, data),
    onSuccess: (updatedOrg) => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      setOrganization(updatedOrg);
      setStoreCurrency(updatedOrg.currency || 'GHS');
      toast.success('Church profile updated successfully');
    },
    onError: () => {
      toast.error('Failed to update church profile');
    },
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalLogoUrl = logoUrl;
    
    // If a new logo file was selected, upload it first
    if (logoFile) {
      // TODO: Implement actual file upload to your storage service (e.g., AWS S3, Cloudinary)
      // For now, we'll use the preview URL (data URL)
      // In production, you would upload the file and get back a URL
      finalLogoUrl = logoPreview;
      toast('Logo upload would happen here in production');
    }
    
    updateMutation.mutate({ churchName, legalName, currency, logoUrl: finalLogoUrl });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Logo file size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setLogoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Settings }[] = [
    { id: 'profile', label: 'Church Profile', icon: Building2 },
    { id: 'account', label: 'Account', icon: User },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
  ];

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Settings" description="Manage your church and account settings" />
        <Card padding="lg">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your church and account settings"
      />

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-background'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Church Profile */}
      {activeTab === 'profile' && (
        <Card>
          <h2 className="text-lg font-semibold text-foreground mb-1">Church Profile</h2>
          <p className="text-sm text-muted mb-6">Update your church information and preferences.</p>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Church Logo
              </label>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {logoPreview ? (
                    <div className="relative w-24 h-24 rounded-lg border-2 border-border overflow-hidden bg-background">
                      <img
                        src={logoPreview}
                        alt="Church logo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/20">
                      <ImageIcon className="w-8 h-8 text-muted" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Upload className="w-4 h-4" />}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Logo
                    </Button>
                    {logoPreview && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveLogo}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-2">
                    PNG, JPG or GIF (max. 5MB)
                  </p>
                </div>
              </div>
            </div>

            <Input
              label="Church Name"
              value={churchName}
              onChange={(e) => setChurchName(e.target.value)}
              placeholder="Enter church name"
            />
            <Input
              label="Legal Name"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Enter legal name"
            />
            <Select
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={currencyOptions}
              placeholder="Select currency"
            />
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                isLoading={updateMutation.isPending}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 2: Account */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* User Info Card */}
          <Card>
            <h2 className="text-lg font-semibold text-foreground mb-4">Your Profile</h2>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-white">
                  {user ? getInitials(user.firstName, user.lastName) : '??'}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  {user ? `${user.firstName} ${user.lastName}` : 'Unknown User'}
                </h3>
                <p className="text-muted">{user?.email || 'No email'}</p>
                <div className="mt-1">
                  <Badge variant={user ? roleBadgeVariant[user.role] || 'muted' : 'muted'}>
                    {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Unknown'}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Change Password Card */}
          <Card>
            <h2 className="text-lg font-semibold text-foreground mb-1">Change Password</h2>
            <p className="text-sm text-muted mb-4">
              To change your password, use the password reset flow.
            </p>
            <Button
              variant="outline"
              onClick={() => toast('Password reset link sent to your email')}
            >
              Reset Password
            </Button>
          </Card>
        </div>
      )}

      {/* Tab 3: Subscription */}
      {activeTab === 'subscription' && (
        <SubscriptionTab
          organization={organization}
          subscriptionData={subscriptionData}
          isSubscriptionLoading={isSubscriptionLoading}
          isSubscriptionError={isSubscriptionError}
        />
      )}
    </div>
  );
}
