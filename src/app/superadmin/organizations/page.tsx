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
  // Subscription fields
  planId: 'seed',
  billingCycle: 'monthly',
  currentPeriodEnd: '',
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
  const [formStep, setFormStep] = useState(1); // 1: Org Info, 2: Admin User, 3: Subscription
  
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
    setFormStep(1);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setFormStep(1);
  };

  const nextStep = () => {
    // Validation for each step
    if (formStep === 1) {
      if (!form.churchName) {
        flash('Church name is required.', true);
        return;
      }
    } else if (formStep === 2) {
      if (!form.adminEmail || !form.adminPassword || !form.adminFirstName || !form.adminLastName) {
        flash('All admin fields are required.', true);
        return;
      }
    }
    setFormStep(formStep + 1);
  };

  const prevStep = () => {
    setFormStep(formStep - 1);
  };

  const save = async () => {
    if (!form.churchName || !form.adminEmail || !form.adminPassword || !form.adminFirstName || !form.adminLastName) {
      flash('All required fields must be filled.', true);
      return;
    }
    setSaving(true);
    try {
      // Create organization
      const orgResponse = await api.post('/api/superadmin/organizations', {
        churchName: form.churchName,
        legalName: form.legalName,
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword,
        adminFirstName: form.adminFirstName,
        adminLastName: form.adminLastName,
        currency: form.currency,
        organizationalStructure: form.organizationalStructure,
      });
      
      const orgId = orgResponse.data.organization._id;
      
      // Create subscription
      await api.post('/api/superadmin/subscriptions', {
        orgId,
        planId: form.planId,
        status: 'active',
        billingCycle: form.billingCycle,
        currentPeriodEnd: form.currentPeriodEnd || undefined,
      });
      
      flash('Organization and subscription created successfully.');
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
              <div>
                <h2 className="text-lg font-semibold text-foreground">Create New Organization</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Step {formStep} of 3: {formStep === 1 ? 'Organization Details' : formStep === 2 ? 'Admin User' : 'Subscription Plan'}
                </p>
              </div>
              <button onClick={closeForm} className="p-1 rounded-lg hover:bg-background">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            {/* Error/Success Message inside modal */}
            {msg && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${isError ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
                <CheckCircle className="w-4 h-4" /> {msg}
              </div>
            )}

            {/* Progress indicator */}
            <div className="flex items-center gap-2">
              <div className={`flex-1 h-1.5 rounded-full ${formStep >= 1 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`flex-1 h-1.5 rounded-full ${formStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`flex-1 h-1.5 rounded-full ${formStep >= 3 ? 'bg-primary' : 'bg-muted'}`} />
            </div>

            <div className="space-y-4">
              {/* Step 1: Organization Details */}
              {formStep === 1 && (
                <>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Currency</label>
                      <select
                        value={form.currency}
                        onChange={(e) => setForm({ ...form, currency: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                      >
                        <option value="GHS">GHS (Ghanaian Cedi)</option>
                        <option value="USD">USD (US Dollar)</option>
                        <option value="NGN">NGN (Nigerian Naira)</option>
                        <option value="KES">KES (Kenyan Shilling)</option>
                        <option value="ZAR">ZAR (South African Rand)</option>
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
                </>
              )}

              {/* Step 2: Admin User */}
              {formStep === 2 && (
                <div className="space-y-4">
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
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              )}

              {/* Step 3: Subscription */}
              {formStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-2">Subscription Plan</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {PLANS.map((plan) => (
                        <button
                          key={plan}
                          onClick={() => setForm({ ...form, planId: plan })}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${
                            form.planId === plan
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <p className="text-sm font-semibold capitalize">{plan}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Billing Cycle</label>
                      <select
                        value={form.billingCycle}
                        onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="annual">Annual</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Period End Date (optional)
                      </label>
                      <input
                        type="date"
                        value={form.currentPeriodEnd}
                        onChange={(e) => setForm({ ...form, currentPeriodEnd: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                      />
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-2">Summary</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Church:</span>
                        <span className="font-medium">{form.churchName || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Admin:</span>
                        <span className="font-medium">{form.adminFirstName && form.adminLastName ? `${form.adminFirstName} ${form.adminLastName}` : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plan:</span>
                        <span className="font-medium capitalize">{form.planId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Billing:</span>
                        <span className="font-medium capitalize">{form.billingCycle}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              {formStep > 1 && (
                <button
                  onClick={prevStep}
                  className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-background"
                >
                  Back
                </button>
              )}
              {formStep < 3 ? (
                <button
                  onClick={nextStep}
                  className="px-6 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90"
                >
                  Next
                </button>
              ) : (
                <>
                  <button
                    onClick={closeForm}
                    className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-background"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={save}
                    disabled={saving}
                    className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? 'Creating...' : 'Create Organization'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
