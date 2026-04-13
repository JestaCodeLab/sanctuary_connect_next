'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, AlertCircle, Users, CreditCard, MessageSquare,
  CheckCircle, Building2, Calendar, Network, Plus, Pencil, Trash2, X,
} from 'lucide-react';
import { api } from '@/lib/api';

interface OrgDetail {
  org: {
    _id: string;
    churchName: string;
    legalName?: string;
    status?: string;
    currency: string;
    structure: string;
    onboardingComplete: boolean;
    createdAt: string;
    adminId?: { firstName: string; lastName: string; email: string; phone?: string; status: string };
    subscriptionId?: {
      _id: string;
      planId: string;
      status: string;
      billingCycle: string;
      currentPeriodStart: string;
      currentPeriodEnd: string;
    };
  };
  memberCount: number;
  branchCount: number;
  departmentCount: number;
  eventCount: number;
  smsCredit?: { balance: number; totalPurchased: number; totalUsed: number };
}

const PLANS = ['seed', 'growth', 'ascend', 'sanctuary'];
const STATUSES = ['active', 'cancelled', 'past_due', 'trialing', 'paused'];
const BILLING_CYCLES = ['monthly', 'annual', 'custom'];

type OrgStatus = 'active' | 'suspended';

function StatTile({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <Icon className="w-8 h-8 text-primary flex-shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

export default function OrgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionIsError, setActionIsError] = useState(false);

  // Organization edit state
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState({
    churchName: '',
    legalName: '',
    currency: 'GHS',
    organizationalStructure: 'single-branch',
  });
  const [editSaving, setEditSaving] = useState(false);

  // Subscription edit/create state
  const [showSubForm, setShowSubForm] = useState(false);
  const [subPlan, setSubPlan] = useState('seed');
  const [subStatus, setSubStatus] = useState('active');
  const [subCycle, setSubCycle] = useState('monthly');
  const [subEnd, setSubEnd] = useState('');
  const [subSaving, setSubSaving] = useState(false);

  const fetchData = () => {
    setLoading(true);
    api
      .get(`/api/superadmin/organizations/${id}`)
      .then((r) => {
        setData(r.data);
        // Populate edit form with current data
        setEditForm({
          churchName: r.data.org.churchName,
          legalName: r.data.org.legalName || '',
          currency: r.data.org.currency,
          organizationalStructure: r.data.org.structure || 'single-branch',
        });
        if (r.data.org.subscriptionId) {
          setSubPlan(r.data.org.subscriptionId.planId);
          setSubStatus(r.data.org.subscriptionId.status);
          setSubCycle(r.data.org.subscriptionId.billingCycle);
          setSubEnd(r.data.org.subscriptionId.currentPeriodEnd?.slice(0, 10) ?? '');
        }
      })
      .catch(() => setError('Failed to load organization'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

  const showMessage = (msg: string, isError = false) => {
    setActionMsg(msg);
    setActionIsError(isError);
    setTimeout(() => setActionMsg(''), 4000);
  };

  const toggleStatus = async () => {
    if (!data) return;
    const current = (data.org.status ?? 'active') as OrgStatus;
    const next: OrgStatus = current === 'suspended' ? 'active' : 'suspended';
    if (!window.confirm(`${next === 'suspended' ? 'Suspend' : 'Reactivate'} "${data.org.churchName}"?`)) return;

    setActionLoading(true);
    try {
      await api.patch(`/api/superadmin/organizations/${id}/status`, { status: next });
      setData((prev) => prev ? { ...prev, org: { ...prev.org, status: next } } : prev);
      showMessage(`Organization ${next === 'suspended' ? 'suspended' : 'reactivated'} successfully.`);
    } catch {
      showMessage('Failed to update organization status.', true);
    } finally {
      setActionLoading(false);
    }
  };

  const saveSubscription = async () => {
    if (!data) return;
    setSubSaving(true);
    const hasSub = !!data.org.subscriptionId;
    try {
      if (hasSub) {
        await api.patch(`/api/superadmin/subscriptions/${id}`, {
          planId: subPlan,
          status: subStatus,
          billingCycle: subCycle,
          currentPeriodEnd: subEnd,
        });
      } else {
        await api.post('/api/superadmin/subscriptions', {
          orgId: id,
          planId: subPlan,
          status: subStatus,
          billingCycle: subCycle,
          currentPeriodEnd: subEnd || undefined,
        });
      }
      showMessage('Subscription saved successfully.');
      setShowSubForm(false);
      fetchData();
    } catch {
      showMessage('Failed to save subscription.', true);
    } finally {
      setSubSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editForm.churchName) {
      showMessage('Church name is required.', true);
      return;
    }
    setEditSaving(true);
    try {
      await api.patch(`/api/superadmin/organizations/${id}`, editForm);
      showMessage('Organization updated successfully.');
      setShowEditForm(false);
      fetchData();
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Failed to update organization.', true);
    } finally {
      setEditSaving(false);
    }
  };

  const deleteOrg = async () => {
    if (!data) return;
    const churchName = data.org.churchName;
    const confirmed = window.prompt(
      `⚠️ This will permanently delete "${churchName}" and all associated data.\n\nType the church name to confirm deletion:`
    );
    if (confirmed !== churchName) {
      if (confirmed !== null) showMessage('Church name did not match.', true);
      return;
    }

    setActionLoading(true);
    try {
      await api.delete(`/api/superadmin/organizations/${id}`);
      showMessage('Organization deleted successfully.');
      setTimeout(() => router.push('/superadmin/organizations'), 1500);
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Failed to delete organization.', true);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 text-error p-4 bg-error/10 rounded-lg">
        <AlertCircle className="w-5 h-5" /> {error || 'Organization not found'}
      </div>
    );
  }

  const { org, memberCount, branchCount, departmentCount, eventCount, smsCredit } = data;
  const isSuspended = org.status === 'suspended';
  const hasSub = !!org.subscriptionId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/superadmin/organizations" className="p-1.5 rounded-lg hover:bg-background border border-border">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{org.churchName}</h1>
          {org.legalName && <p className="text-muted-foreground text-sm">{org.legalName}</p>}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          isSuspended ? 'bg-error/10 text-error' : 'bg-success/10 text-success'
        }`}>
          {isSuspended ? 'Suspended' : 'Active'}
        </span>
      </div>

      {/* Action message */}
      {actionMsg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          actionIsError ? 'bg-error/10 text-error' : 'bg-success/10 text-success'
        }`}>
          <CheckCircle className="w-4 h-4" /> {actionMsg}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Members" value={memberCount} icon={Users} />
        <StatTile label="Branches" value={branchCount} icon={Building2} />
        <StatTile label="Departments" value={departmentCount} icon={Network} />
        <StatTile label="Events" value={eventCount} icon={Calendar} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Org Info */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Organization Info</h2>
            <button
              onClick={() => setShowEditForm(!showEditForm)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          </div>
          
          {!showEditForm ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Church Name</dt><dd>{org.churchName}</dd></div>
              {org.legalName && <div className="flex justify-between"><dt className="text-muted-foreground">Legal Name</dt><dd>{org.legalName}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted-foreground">Structure</dt><dd className="capitalize">{org.structure}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Currency</dt><dd>{org.currency}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Onboarding</dt><dd>{org.onboardingComplete ? 'Complete' : 'Incomplete'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Joined</dt><dd>{new Date(org.createdAt).toLocaleDateString()}</dd></div>
            </dl>
          ) : (
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Church Name</label>
                <input
                  type="text"
                  value={editForm.churchName}
                  onChange={(e) => setEditForm({ ...editForm, churchName: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Legal Name</label>
                <input
                  type="text"
                  value={editForm.legalName}
                  onChange={(e) => setEditForm({ ...editForm, legalName: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Currency</label>
                <select
                  value={editForm.currency}
                  onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                >
                  <option value="GHS">GHS</option>
                  <option value="USD">USD</option>
                  <option value="NGN">NGN</option>
                  <option value="KES">KES</option>
                  <option value="ZAR">ZAR</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Structure</label>
                <select
                  value={editForm.organizationalStructure}
                  onChange={(e) => setEditForm({ ...editForm, organizationalStructure: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                >
                  <option value="single-branch">Single Branch</option>
                  <option value="multi-branch">Multi Branch</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowEditForm(false)}
                  className="flex-1 px-3 py-2 rounded-lg border border-border text-sm hover:bg-background">
                  Cancel
                </button>
                <button onClick={saveEdit} disabled={editSaving}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 disabled:opacity-50">
                  {editSaving ? 'Saving...' : 'Update'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Admin Account</h2>
          {org.adminId ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Name</dt><dd>{org.adminId.firstName} {org.adminId.lastName}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Email</dt><dd className="truncate max-w-[200px]">{org.adminId.email}</dd></div>
              {org.adminId.phone && <div className="flex justify-between"><dt className="text-muted-foreground">Phone</dt><dd>{org.adminId.phone}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd className="capitalize">{org.adminId.status}</dd></div>
            </dl>
          ) : <p className="text-sm text-muted-foreground">No admin linked</p>}
        </div>

        {/* Subscription */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Subscription</h2>
            <button
              onClick={() => setShowSubForm(!showSubForm)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              {hasSub ? 'Edit' : <><Plus className="w-3.5 h-3.5" /> Add Subscription</>}
            </button>
          </div>

          {!hasSub && !showSubForm && (
            <p className="text-sm text-muted-foreground">No subscription found for this organization.</p>
          )}

          {hasSub && !showSubForm && (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Plan</dt><dd className="capitalize font-medium">{org.subscriptionId!.planId}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt>
                <dd><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  org.subscriptionId!.status === 'active' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                }`}>{org.subscriptionId!.status}</span></dd>
              </div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Billing</dt><dd className="capitalize">{org.subscriptionId!.billingCycle}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Period Start</dt><dd>{new Date(org.subscriptionId!.currentPeriodStart).toLocaleDateString()}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Period End</dt><dd>{new Date(org.subscriptionId!.currentPeriodEnd).toLocaleDateString()}</dd></div>
            </dl>
          )}

          {showSubForm && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Plan</label>
                <select value={subPlan} onChange={(e) => setSubPlan(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none">
                  {PLANS.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Status</label>
                <select value={subStatus} onChange={(e) => setSubStatus(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none">
                  {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Billing Cycle</label>
                <select value={subCycle} onChange={(e) => setSubCycle(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none">
                  {BILLING_CYCLES.map((b) => <option key={b} value={b} className="capitalize">{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Period End {!hasSub && '(defaults to 30 days if blank)'}</label>
                <input type="date" value={subEnd} onChange={(e) => setSubEnd(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowSubForm(false)}
                  className="flex-1 px-3 py-2 rounded-lg border border-border text-sm hover:bg-background">
                  Cancel
                </button>
                <button onClick={saveSubscription} disabled={subSaving}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 disabled:opacity-50">
                  {subSaving ? 'Saving...' : hasSub ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SMS Credits */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">SMS Credits</h2>
            <Link href={`/superadmin/sms-credits`} className="text-xs text-primary hover:underline">Adjust →</Link>
          </div>
          {smsCredit ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Balance</dt>
                <dd className={`font-semibold ${smsCredit.balance < 50 ? 'text-error' : 'text-foreground'}`}>
                  {smsCredit.balance.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Total Purchased</dt><dd>{smsCredit.totalPurchased.toLocaleString()}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Total Used</dt><dd>{smsCredit.totalUsed.toLocaleString()}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No SMS credit account yet.</p>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-card border border-error/30 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-error mb-3">Danger Zone</h2>
        
        <div className="space-y-4">
          {/* Suspend/Reactivate */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-foreground font-medium">
                {isSuspended ? 'Reactivate Organization' : 'Suspend Organization'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isSuspended
                  ? 'Restore access for this church and its users.'
                  : 'Prevents all users in this church from accessing the platform.'}
              </p>
            </div>
            <button
              onClick={toggleStatus}
              disabled={actionLoading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap ${
                isSuspended
                  ? 'bg-success text-white hover:bg-success/90'
                  : 'bg-error text-white hover:bg-error/90'
              }`}
            >
              {actionLoading ? 'Updating...' : isSuspended ? 'Reactivate' : 'Suspend'}
            </button>
          </div>

          {/* Delete Organization */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-error/20">
            <div>
              <p className="text-sm text-foreground font-medium">Delete Organization</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently delete this organization and all associated data. This cannot be undone.
              </p>
            </div>
            <button
              onClick={deleteOrg}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-error text-white hover:bg-error/90 disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
