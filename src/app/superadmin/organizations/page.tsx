'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, AlertCircle, ChevronLeft, ChevronRight, ExternalLink, Plus, X, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface OrgRow {
  _id: string;
  churchName: string;
  legalName?: string;
  status?: string;
  adminId?: { firstName: string; lastName: string; email: string };
  subscriptionId?: { planId: string; status: string; currentPeriodEnd: string };
  createdAt: string;
}

const PLANS = ['seed', 'growth', 'ascend', 'sanctuary'];
const PLAN_COLORS: Record<string, string> = {
  seed: 'bg-muted text-muted-foreground',
  growth: 'bg-blue-500/10 text-blue-600',
  ascend: 'bg-purple-500/10 text-purple-600',
  sanctuary: 'bg-amber-500/10 text-amber-600',
};

const EMPTY_FORM = {
  churchName: '',
  legalName: '',
  adminEmail: '',
  adminPassword: '',
  adminFirstName: '',
  adminLastName: '',
  currency: 'GHS',
  organizationalStructure: 'single-branch',
};

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  
  const limit = 20;

  const fetchOrgs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (plan) params.set('plan', plan);
    if (status) params.set('status', status);
    api
      .get(`/api/superadmin/organizations?${params}`)
      .then((r) => { setOrgs(r.data.orgs); setTotal(r.data.total); })
      .catch(() => setError('Failed to load organizations'))
      .finally(() => setLoading(false));
  }, [page, search, plan, status]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, plan, status]);
  
  const flash = (text: string, err = false) => {
    setMsg(text); setIsError(err);
    setTimeout(() => setMsg(''), 4000);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  const save = async () => {
    if (!form.churchName || !form.adminEmail || !form.adminPassword || !form.adminFirstName || !form.adminLastName) {
      flash('All required fields must be filled.', true);
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/superadmin/organizations', form);
      flash('Organization created successfully.');
      closeForm();
      fetchOrgs();
    } catch (err: any) {
      flash(err.response?.data?.error || 'Failed to create organization.', true);
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} churches registered</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> New Organization
        </button>
      </div>
      
      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${isError ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
          <CheckCircle className="w-4 h-4" /> {msg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 flex-1">
          <Search className="w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search by church name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
          />
        </div>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
        >
          <option value="">All plans</option>
          {PLANS.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
        >
          <option value="">All statuses</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-error p-4 bg-error/10 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Church</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Admin</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Plan</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Sub Status</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Org Status</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</td>
                </tr>
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">No organizations found</td>
                </tr>
              ) : orgs.map((org) => (
                <tr key={org._id} className="border-b border-border last:border-0 hover:bg-background/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{org.churchName}</p>
                    {org.legalName && <p className="text-xs text-muted-foreground">{org.legalName}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {org.adminId ? (
                      <>
                        <p className="text-foreground">{org.adminId.firstName} {org.adminId.lastName}</p>
                        <p className="text-xs text-muted-foreground">{org.adminId.email}</p>
                      </>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {org.subscriptionId ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PLAN_COLORS[org.subscriptionId.planId] ?? ''}`}>
                        {org.subscriptionId.planId}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {org.subscriptionId ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        org.subscriptionId.status === 'active' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                      }`}>
                        {org.subscriptionId.status}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      org.status === 'suspended' ? 'bg-error/10 text-error' : 'bg-success/10 text-success'
                    }`}>
                      {org.status ?? 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/superadmin/organizations/${org._id}`} className="text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3.5 h-3.5" /> View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-border hover:bg-background disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-border hover:bg-background disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Create New Organization</h2>
              <button onClick={closeForm} className="p-1 rounded-lg hover:bg-background">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Church Name *</label>
                  <input
                    type="text"
                    value={form.churchName}
                    onChange={(e) => setForm({ ...form, churchName: e.target.value })}
                    placeholder="e.g. Grace Chapel"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Legal Name</label>
                  <input
                    type="text"
                    value={form.legalName}
                    onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                    placeholder="e.g. Grace Chapel International"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <h3 className="text-sm font-medium text-foreground mb-3">Admin User</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">First Name *</label>
                    <input
                      type="text"
                      value={form.adminFirstName}
                      onChange={(e) => setForm({ ...form, adminFirstName: e.target.value })}
                      placeholder="e.g. John"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={form.adminLastName}
                      onChange={(e) => setForm({ ...form, adminLastName: e.target.value })}
                      placeholder="e.g. Smith"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Email *</label>
                    <input
                      type="email"
                      value={form.adminEmail}
                      onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                      placeholder="admin@church.org"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Password *</label>
                    <input
                      type="password"
                      value={form.adminPassword}
                      onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                      placeholder="Strong password"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <h3 className="text-sm font-medium text-foreground mb-3">Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Currency</label>
                    <select
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value })}
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
                      value={form.organizationalStructure}
                      onChange={(e) => setForm({ ...form, organizationalStructure: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                    >
                      <option value="single-branch">Single Branch</option>
                      <option value="multi-branch">Multi Branch</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={closeForm}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-background">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Organization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
