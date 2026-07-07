'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Building2, CheckCircle, Clock, ShieldOff } from 'lucide-react';

import { PageHeader, Badge, Modal } from '@/components/dashboard';
import { Button, Input, Card, Select } from '@/components/ui';
import { api, financeApi } from '@/lib/api';
import type { BranchAccountSummary } from '@/types';

interface SubaccountFormData {
  bankCode: string;
  bankAccountName: string;
  bankAccountNumber: string;
}

const statusBadge = (branch: BranchAccountSummary) => {
  if (!branch.hasAccount) return <Badge variant="muted">No Account</Badge>;
  if (branch.status === 'approved') return <Badge variant="success">Approved</Badge>;
  if (branch.status === 'pending') return <Badge variant="warning">Pending</Badge>;
  if (branch.status === 'rejected') return <Badge variant="error">Rejected</Badge>;
  if (branch.status === 'revoked') return <Badge variant="error">Revoked</Badge>;
  return <Badge variant="muted">{branch.status}</Badge>;
};

function SetupSubaccountModal({ branch, onClose }: { branch: BranchAccountSummary | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SubaccountFormData>();

  useEffect(() => {
    if (!branch) return;
    api.get('/api/finance/banks').then((res) => setBanks(res.data.banks || [])).catch(() => setBanks([]));
  }, [branch]);

  const createMutation = useMutation({
    mutationFn: (data: SubaccountFormData) => financeApi.createBranchSubaccount(branch!.branchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'branch-accounts'] });
      toast.success('Branch account created successfully');
      reset();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to create branch account');
    },
  });

  const bankOptions = banks.map((b) => ({ value: b.code, label: b.name }));

  return (
    <Modal isOpen={!!branch} onClose={onClose} title={`Set Up Account — ${branch?.branchName ?? ''}`}>
      <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
        <p className="text-sm text-muted">
          This creates a Paystack subaccount under your organization&apos;s primary account. Payments to
          this branch will settle directly to the bank account below.
        </p>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Bank</label>
          <Select
            options={bankOptions}
            placeholder="Select bank"
            error={errors.bankCode?.message}
            {...register('bankCode', { required: 'Bank is required' })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Account Holder Name</label>
          <Input placeholder="Name on bank account" {...register('bankAccountName', { required: 'Account name is required' })} />
          {errors.bankAccountName && <span className="text-sm text-red-600">{errors.bankAccountName.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Account Number (10 digits)</label>
          <Input
            maxLength={10}
            placeholder="Enter 10-digit account number"
            {...register('bankAccountNumber', { required: 'Account number is required', minLength: 10, maxLength: 10 })}
          />
          {errors.bankAccountNumber && <span className="text-sm text-red-600">Account number must be 10 digits</span>}
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending} isLoading={createMutation.isPending} className="flex-1">
            Create Account
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function FinanceSettingsPage() {
  const [setupTarget, setSetupTarget] = useState<BranchAccountSummary | null>(null);

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['finance', 'branch-accounts'],
    queryFn: financeApi.getBranchAccounts,
  });

  const primary = branches.find((b) => b.tier === 'primary');
  const hasApprovedPrimary = primary?.status === 'approved';

  return (
    <div>
      <PageHeader
        title="Finance Settings"
        description="Manage finance accounts for each of your branches"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <Card padding="none">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Branches</h2>
            <p className="text-sm text-muted mt-1">
              One primary Paystack business account per organization; every other branch collects
              payments through its own subaccount under that primary account.
            </p>
          </div>

          <div className="divide-y divide-border">
            {branches.map((branch) => (
              <div key={branch.branchId} className="p-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{branch.branchName}</h3>
                      {branch.tier === 'primary' && <Badge variant="info">Primary</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {statusBadge(branch)}
                      {branch.tier === 'primary' && branch.status === 'approved' && (
                        <span className="text-xs text-muted flex items-center gap-1">
                          {branch.paystackKeysConfigured ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-green-600" /> Paystack keys configured
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" /> Awaiting Paystack keys from superadmin
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!branch.hasAccount && (
                  hasApprovedPrimary ? (
                    <Button size="sm" onClick={() => setSetupTarget(branch)}>
                      Set Up Account
                    </Button>
                  ) : (
                    <span className="text-xs text-muted flex items-center gap-1">
                      <ShieldOff className="w-3 h-3" /> Primary account required first
                    </span>
                  )
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {!isLoading && !primary && (
        <p className="text-sm text-muted mt-4">
          No branch has submitted a primary finance account yet. Complete the KYC wizard from the
          Finance module on any branch to get started.
        </p>
      )}

      <SetupSubaccountModal branch={setupTarget} onClose={() => setSetupTarget(null)} />
    </div>
  );
}
