'use client';

import { use, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle, XCircle, Heart, Gift, Target, Mail, User, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Button, Input } from '@/components/ui';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type GivingType = 'tithe' | 'offering' | 'project';

interface GivingInfo {
  churchName: string;
  currency: string;
  branches: { _id: string; name: string; givingEnabled: boolean }[];
  selectedBranchId: string | null;
  givingEnabled: boolean;
  offeringTypes: { _id: string; name: string }[];
  projects: { _id: string; name: string; targetAmount: number | null; raisedAmount: number }[];
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export default function PublicGivingPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = use(params);
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  const eventId = searchParams.get('eventId') || undefined;
  const eventTitle = searchParams.get('eventTitle') || undefined;
  const eventDate = searchParams.get('eventDate') || undefined;

  const [branchId, setBranchId] = useState<string | undefined>(searchParams.get('branchId') || undefined);
  const [givingType, setGivingType] = useState<GivingType>(eventId ? 'offering' : 'tithe');
  const [offeringTypeId, setOfferingTypeId] = useState('');
  const [fundBucketId, setFundBucketId] = useState('');
  const [amount, setAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [email, setEmail] = useState('');
  const [donorPhone, setDonorPhone] = useState('');

  const { data: info, isLoading: infoLoading, error: infoError } = useQuery<GivingInfo>({
    queryKey: ['public-giving-info', organizationId, branchId],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/public/giving/${organizationId}/info`, {
        params: branchId ? { branchId } : undefined,
      });
      return response.data;
    },
    retry: false,
    enabled: !reference,
  });

  // Once we know the resolved branch (auto-picked or explicit), keep local state in sync
  // so the submit payload always has a concrete branchId.
  useEffect(() => {
    if (info?.selectedBranchId && !branchId) {
      setBranchId(info.selectedBranchId);
    }
  }, [info, branchId]);

  useEffect(() => {
    if (info?.offeringTypes?.length && !offeringTypeId) {
      setOfferingTypeId(info.offeringTypes[0]._id);
    }
  }, [info, offeringTypeId]);

  const verifyQuery = useQuery({
    queryKey: ['public-giving-verify', reference, organizationId],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/public/giving/verify/${reference}`, {
        params: { organizationId },
      });
      return response.data;
    },
    enabled: !!reference,
    retry: false,
  });

  const initializeMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`${API_URL}/api/public/giving/initialize`, {
        organizationId,
        branchId,
        donationType: givingType,
        offeringTypeId: givingType === 'offering' ? offeringTypeId : undefined,
        fundBucketId: givingType === 'project' ? fundBucketId : undefined,
        eventId,
        amount: Number(amount),
        email,
        donorName: donorName.trim() || undefined,
        donorPhone: donorPhone.trim() || undefined,
      });
      return response.data;
    },
    onSuccess: (data) => {
      window.location.href = data.authorization_url;
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to start payment');
    },
  });

  const handleSubmit = () => {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (givingType === 'project' && !fundBucketId) {
      toast.error('Please select a project');
      return;
    }
    if (!branchId) {
      toast.error('Please select a branch');
      return;
    }
    initializeMutation.mutate();
  };

  const shellClass = 'min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-4';

  // Post-payment verification screen
  if (reference) {
    if (verifyQuery.isLoading) {
      return (
        <div className={shellClass}>
          <Card padding="lg" className="w-full max-w-md">
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          </Card>
        </div>
      );
    }

    if (verifyQuery.isError || !verifyQuery.data?.success) {
      return (
        <div className={shellClass}>
          <Card padding="lg" className="w-full max-w-md">
            <div className="text-center py-8">
              <XCircle className="w-16 h-16 text-error mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Payment Not Confirmed</h1>
              <p className="text-muted">
                {(verifyQuery.error as any)?.response?.data?.message || 'We could not confirm this payment. If you were charged, please contact the church.'}
              </p>
            </div>
          </Card>
        </div>
      );
    }

    const donation = verifyQuery.data.donation;
    return (
      <div className={shellClass}>
        <Card padding="lg" className="w-full max-w-md">
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Thank You!</h1>
            <p className="text-muted mb-6">Your gift has been received.</p>
            {donation && (
              <div className="bg-muted/20 rounded-lg p-4 text-left space-y-2 text-sm">
                <p><span className="font-medium text-foreground">Amount:</span> <span className="text-muted">{formatMoney(donation.amount, 'GHS')}</span></p>
                <p><span className="font-medium text-foreground">Type:</span> <span className="text-muted capitalize">{donation.donationType}</span></p>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (infoLoading) {
    return (
      <div className={shellClass}>
        <Card padding="lg" className="w-full max-w-md">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </Card>
      </div>
    );
  }

  if (infoError || !info) {
    return (
      <div className={shellClass}>
        <Card padding="lg" className="w-full max-w-md">
          <div className="text-center py-8">
            <XCircle className="w-16 h-16 text-error mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Church Not Found</h1>
            <p className="text-muted">This giving link is invalid. Please check the link and try again.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!info.givingEnabled) {
    return (
      <div className={shellClass}>
        <Card padding="lg" className="w-full max-w-md">
          <div className="text-center py-8">
            <Heart className="w-16 h-16 text-muted mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">{info.churchName}</h1>
            <p className="text-muted">Online giving isn&apos;t set up for this branch yet. Please check back soon.</p>
          </div>
        </Card>
      </div>
    );
  }

  const tabs: { value: GivingType; label: string; icon: typeof Heart }[] = [
    { value: 'tithe', label: 'Tithe', icon: Heart },
    { value: 'offering', label: 'Offering', icon: Gift },
    { value: 'project', label: 'Project', icon: Target },
  ];

  return (
    <div className={shellClass}>
      <div className="w-full max-w-md space-y-6">
        <Card padding="lg">
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-foreground">{info.churchName}</h1>
            <p className="text-sm text-muted mt-1">Give online securely</p>
          </div>

          {eventTitle && (
            <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20 text-center">
              <p className="text-xs text-muted">Giving for</p>
              <p className="text-sm font-medium text-foreground">
                {eventTitle}{eventDate ? ` — ${new Date(eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}
              </p>
            </div>
          )}

          {info.branches.length > 1 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground mb-2">Branch</label>
              <select
                value={branchId || ''}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {info.branches.filter((b) => b.givingEnabled).map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </Card>

        <Card padding="lg">
          <div className="flex gap-1 p-1 bg-muted/30 rounded-lg mb-5">
            {tabs.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setGivingType(value)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${
                  givingType === value
                    ? 'bg-white dark:bg-gray-800 text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {givingType === 'offering' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Offering Type</label>
                <select
                  value={offeringTypeId}
                  onChange={(e) => setOfferingTypeId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {info.offeringTypes.map((t) => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            {givingType === 'project' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Project</label>
                {info.projects.length === 0 ? (
                  <p className="text-sm text-muted">No active projects right now.</p>
                ) : (
                  <select
                    value={fundBucketId}
                    onChange={(e) => setFundBucketId(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select a project...</option>
                    {info.projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}{p.targetAmount ? ` — ${formatMoney(p.raisedAmount, info.currency)} of ${formatMoney(p.targetAmount, info.currency)}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <Input
              label="Amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <Input
              label="Full Name (Optional)"
              placeholder="Your name"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Phone (Optional)"
              type="tel"
              placeholder="Phone number"
              value={donorPhone}
              onChange={(e) => setDonorPhone(e.target.value)}
              leftIcon={<Phone className="w-4 h-4" />}
            />
          </div>

          <Button
            className="w-full mt-6"
            size="lg"
            onClick={handleSubmit}
            isLoading={initializeMutation.isPending}
            disabled={initializeMutation.isPending}
          >
            Give {amount ? formatMoney(Number(amount) || 0, info.currency) : ''}
          </Button>
        </Card>

        <p className="text-xs text-center text-muted">
          Payments are securely processed by Paystack.
        </p>
      </div>
    </div>
  );
}
