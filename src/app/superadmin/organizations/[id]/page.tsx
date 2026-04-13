'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, AlertCircle, Users, CreditCard, MessageSquare,
  CheckCircle, Building2, Calendar, Network, Plus, Pencil, Trash2, X, GitBranch,
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

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'branches' | 'departments' | 'members'>('overview');

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

  // Branches state
  const [branches, setBranches] = useState<any[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [branchForm, setBranchForm] = useState({ name: '', location: '', isHeadquarters: false });

  // Departments state
  const [departments, setDepartments] = useState<any[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [deptForm, setDeptForm] = useState({ name: '', branchId: '' });

  // Members state
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);

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

  // Fetch branches for this organization
  const fetchBranches = async () => {
    setBranchesLoading(true);
    try {
      const res = await api.get(`/api/superadmin/branches?orgId=${id}`);
      setBranches(res.data.branches || []);
    } catch {
      showMessage('Failed to load branches.', true);
    } finally {
      setBranchesLoading(false);
    }
  };

  // Fetch departments for this organization
  const fetchDepartments = async () => {
    setDepartmentsLoading(true);
    try {
      const res = await api.get(`/api/superadmin/departments?orgId=${id}`);
      setDepartments(res.data.departments || []);
    } catch {
      showMessage('Failed to load departments.', true);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  // Fetch members for this organization
  const fetchMembers = async () => {
    setMembersLoading(true);
    try {
      const res = await api.get(`/api/superadmin/members?orgId=${id}`);
      setMembers(res.data.members || []);
    } catch {
      showMessage('Failed to load members.', true);
    } finally {
      setMembersLoading(false);
    }
  };

  // Fetch data when switching tabs
  useEffect(() => {
    if (activeTab === 'branches') fetchBranches();
    else if (activeTab === 'departments') fetchDepartments();
    else if (activeTab === 'members') fetchMembers();
  }, [activeTab]);

  // Branch CRUD
  const saveBranch = async () => {
    if (!branchForm.name) {
      showMessage('Branch name is required.', true);
      return;
    }
    try {
      if (editingBranch) {
        await api.patch(`/api/superadmin/branches/${editingBranch._id}`, branchForm);
      } else {
        await api.post('/api/superadmin/branches', { ...branchForm, orgId: id });
      }
      showMessage(`Branch ${editingBranch ? 'updated' : 'created'} successfully.`);
      setShowBranchForm(false);
      setEditingBranch(null);
      setBranchForm({ name: '', location: '', isHeadquarters: false });
      fetchBranches();
      fetchData(); // Refresh branch count
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Failed to save branch.', true);
    }
  };

  const deleteBranch = async (branchId: string, branchName: string) => {
    if (!window.confirm(`Delete branch "${branchName}"?`)) return;
    try {
      await api.delete(`/api/superadmin/branches/${branchId}`);
      showMessage('Branch deleted successfully.');
      fetchBranches();
      fetchData();
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Failed to delete branch.', true);
    }
  };

  // Department CRUD
  const saveDepartment = async () => {
    if (!deptForm.name || !deptForm.branchId) {
      showMessage('Department name and branch are required.', true);
      return;
    }
    try {
      if (editingDept) {
        await api.patch(`/api/superadmin/departments/${editingDept._id}`, deptForm);
      } else {
        await api.post('/api/superadmin/departments', { ...deptForm, orgId: id });
      }
      showMessage(`Department ${editingDept ? 'updated' : 'created'} successfully.`);
      setShowDeptForm(false);
      setEditingDept(null);
      setDeptForm({ name: '', branchId: '' });
      fetchDepartments();
      fetchData();
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Failed to save department.', true);
    }
  };

  const deleteDepartment = async (deptId: string, deptName: string) => {
    if (!window.confirm(`Delete department "${deptName}"?`)) return;
    try {
      await api.delete(`/api/superadmin/departments/${deptId}`);
      showMessage('Department deleted successfully.');
      fetchDepartments();
      fetchData();
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Failed to delete department.', true);
    }
  };

  // Member delete (no create - organizations create their own members)
  const deleteMember = async (memberId: string, memberName: string) => {
    if (!window.confirm(`Delete member "${memberName}"?`)) return;
    try {
      await api.delete(`/api/superadmin/members/${memberId}`);
      showMessage('Member deleted successfully.');
      fetchMembers();
      fetchData();
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Failed to delete member.', true);
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
        <StatTile label="Branches" value={branchCount} icon={GitBranch} />
        <StatTile label="Departments" value={departmentCount} icon={Network} />
        <StatTile label="Events" value={eventCount} icon={Calendar} />
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('branches')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'branches'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Branches ({branchCount})
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'departments'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Departments ({departmentCount})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Members ({memberCount})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
      <>
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
      </>
      )}

      {/* Branches Tab */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Branches</h2>
            <button
              onClick={() => {
                setShowBranchForm(true);
                setEditingBranch(null);
                setBranchForm({ name: '', location: '', isHeadquarters: false });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> Add Branch
            </button>
          </div>

          {branchesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No branches yet</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Type</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((branch) => (
                    <tr key={branch._id} className="border-b border-border last:border-0 hover:bg-muted/10">
                      <td className="px-4 py-3 text-sm text-foreground">{branch.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{branch.location || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        {branch.isHeadquarters && (
                          <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">HQ</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingBranch(branch);
                            setBranchForm({
                              name: branch.name,
                              location: branch.location || '',
                              isHeadquarters: branch.isHeadquarters || false,
                            });
                            setShowBranchForm(true);
                          }}
                          className="text-primary hover:underline text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteBranch(branch._id, branch.name)}
                          className="text-error hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Branch Form Modal */}
          {showBranchForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{editingBranch ? 'Edit' : 'Add'} Branch</h3>
                  <button onClick={() => setShowBranchForm(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Name *</label>
                    <input
                      type="text"
                      value={branchForm.name}
                      onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Location</label>
                    <input
                      type="text"
                      value={branchForm.location}
                      onChange={(e) => setBranchForm({ ...branchForm, location: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={branchForm.isHeadquarters}
                      onChange={(e) => setBranchForm({ ...branchForm, isHeadquarters: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label className="text-sm text-foreground">Set as Headquarters</label>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowBranchForm(false)}
                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-background"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveBranch}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                  >
                    {editingBranch ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Departments</h2>
            <button
              onClick={() => {
                setShowDeptForm(true);
                setEditingDept(null);
                setDeptForm({ name: '', branchId: '' });
                // Fetch branches if not already loaded
                if (branches.length === 0) fetchBranches();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> Add Department
            </button>
          </div>

          {departmentsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <Network className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No departments yet</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Branch</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept._id} className="border-b border-border last:border-0 hover:bg-muted/10">
                      <td className="px-4 py-3 text-sm text-foreground">{dept.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {dept.branchId?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingDept(dept);
                            setDeptForm({
                              name: dept.name,
                              branchId: dept.branchId?._id || '',
                            });
                            setShowDeptForm(true);
                          }}
                          className="text-primary hover:underline text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteDepartment(dept._id, dept.name)}
                          className="text-error hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Department Form Modal */}
          {showDeptForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{editingDept ? 'Edit' : 'Add'} Department</h3>
                  <button onClick={() => setShowDeptForm(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Name *</label>
                    <input
                      type="text"
                      value={deptForm.name}
                      onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Branch *</label>
                    <select
                      value={deptForm.branchId}
                      onChange={(e) => setDeptForm({ ...deptForm, branchId: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Select branch</option>
                      {branches.map((b) => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowDeptForm(false)}
                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-background"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveDepartment}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                  >
                    {editingDept ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Members</h2>
          </div>

          {membersLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No members yet</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Phone</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Branch</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member._id} className="border-b border-border last:border-0 hover:bg-muted/10">
                      <td className="px-4 py-3 text-sm text-foreground">
                        {member.firstName} {member.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{member.email || '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{member.phone || '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {member.branchId?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteMember(member._id, `${member.firstName} ${member.lastName}`)}
                          className="text-error hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
