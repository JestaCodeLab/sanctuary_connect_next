'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Settings, Building2, User, CreditCard, Save } from 'lucide-react';
import { PageHeader, Badge } from '@/components/dashboard';
import { Button, Input, Card, Select } from '@/components/ui';
import { organizationApi, subscriptionApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type Tab = 'profile' | 'account' | 'subscription';

const currencyOptions = [
  { value: 'GHS', label: 'GHS - Ghanaian Cedi' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'NGN', label: 'NGN - Nigerian Naira' },
];

const paymentGatewayOptions = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'paystack', label: 'Paystack' },
  { value: 'none', label: 'None' },
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

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Form state for church profile
  const [churchName, setChurchName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [currency, setCurrency] = useState('');
  const [paymentGateway, setPaymentGateway] = useState('');

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
      setPaymentGateway(organization.paymentGateway || '');
    }
  }, [organization]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: { churchName: string; legalName: string; currency: string; paymentGateway: string }) =>
      organizationApi.update(organization!._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Church profile updated successfully');
    },
    onError: () => {
      toast.error('Failed to update church profile');
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ churchName, legalName, currency, paymentGateway });
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
            <Select
              label="Payment Gateway"
              value={paymentGateway}
              onChange={(e) => setPaymentGateway(e.target.value)}
              options={paymentGatewayOptions}
              placeholder="Select payment gateway"
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
        <Card>
          <h2 className="text-lg font-semibold text-foreground mb-1">Subscription</h2>
          <p className="text-sm text-muted mb-6">Manage your subscription plan and billing.</p>

          {isSubscriptionLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isSubscriptionError ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-muted mx-auto mb-3" />
              <p className="text-foreground font-medium">No active subscription</p>
              <p className="text-sm text-muted mt-1">
                You do not have an active subscription plan.
              </p>
            </div>
          ) : subscriptionData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted">Plan</p>
                  <p className="text-foreground font-medium">
                    {subscriptionData.plan?.name || subscriptionData.subscription.planId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted">Billing Cycle</p>
                  <p className="text-foreground font-medium capitalize">
                    {subscriptionData.subscription.billingCycle}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted">Status</p>
                  <div className="mt-0.5">
                    <Badge
                      variant={
                        subscriptionStatusVariant[subscriptionData.subscription.status] || 'muted'
                      }
                    >
                      {subscriptionData.subscription.status.charAt(0).toUpperCase() +
                        subscriptionData.subscription.status.slice(1).replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted">Current Period</p>
                  <p className="text-foreground text-sm">
                    {formatDate(subscriptionData.subscription.currentPeriodStart)} &mdash;{' '}
                    {formatDate(subscriptionData.subscription.currentPeriodEnd)}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => toast('Subscription management coming soon')}
                >
                  Manage Subscription
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}
