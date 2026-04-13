'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, AlertCircle, ChevronLeft, ChevronRight, Plus, X, CheckCircle, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Branch {
  _id: string;
  organizationId: { _id: string; churchName: string; logoUrl?: string };
  branchName: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  isDefault: boolean;
  createdAt: string;
}

interface BranchForm {
  organizationId: string;
  branchName: string;
  location: string;
  address: string;
  phone: string;
  email: string;
  isDefault: boolean;
}

const EMPTY_FORM: BranchForm = {
  organizationId: '',
  branchName: '',
  location: '',
  address: '',
  phone: '',
  email: '',
  isDefault: false,
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [orgId, setOrgId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<BranchForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  
  const [orgs, setOrgs] = useState<Array<{_id: string; churchName: string}>>([]);

  const limit = 20;

  const fetchBranches = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (orgId) params.set('orgId', orgId);
    api
      .get(`/api/superadmin/branches?${params}`)
      .then((r) => { setBranches(r.data.branches); setTotal(r.data.total); })
      .catch(() => setError('Failed to load branches'))
      .finally(() => setLoading(false));
  }, [page, search, orgId]);

  const fetchOrgs = useCallback(() => {
    api.get('/api/superadmin/organizations?limit=1000')
      .then((r) => setOrgs(r.data.orgs.map((o: any) => ({ _id: o._id, churchName: o.churchName }))))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);
  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);
  useEffect(() => { setPage(1); }, [search, orgId]);

  const flash = (text: string, err = false) => {
    setMsg(text); setIsError(err);
    setTimeout(() => setMsg(''), 4000);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (branch: Branch) => {
    setEditing(branch);
    setForm({
      organizationId: branch.organizationId._id,
      branchName: branch.branchName,
      location: branch.location || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      isDefault: branch.isDefault,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const save = async () => {
    if (!form.organizationId || !form.branchName) {
      flash('Organization and branch name are required.', true);
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/api/superadmin/branches/${editing._id}`, form);
        flash('Branch updated.');
      } else {
        await api.post('/api/superadmin/branches', form);
        flash('Branch created.');
      }
      closeForm();
      fetchBranches();
    } catch (err: any) {
      flash(err.response?.data?.error || 'Failed to save branch.', true);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (branch: Branch) => {
    if (!window.confirm(`Delete branch "${branch.branchName}"?`)) return;
    try {
      await api.delete(`/api/superadmin/branches/${branch._id}`);
      flash('Branch deleted.');
      fetchBranches();
    } catch (err: any) {
      flash(err.response?.data?.error || 'Failed to delete branch.', true);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Branches</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} branches</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> New Branch
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
            placeholder="Search branches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
          />
        </div>
        <select
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
        >
          <option value="">All organizations</option>
          {orgs.map((o) => <option key={o._id} value={o._id}>{o.churchName}</option>)}
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
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Branch</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Organization</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Location</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Contact</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
              ) : branches.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No branches found</td></tr>
              ) : branches.map((branch) => (
                <tr key={branch._id} className="border-b border-border last:border-0 hover:bg-background/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{branch.branchName}</p>
                    {branch.isDefault && <span className="text-xs text-primary">Default</span>}
                  </td>
                  <td className="px-4 py-3 text-foreground">{branch.organizationId?.churchName || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{branch.location || '—'}</td>
                  <td className="px-4 py-3">
                    {branch.phone && <p className="text-foreground text-xs">{branch.phone}</p>}
                    {branch.email && <p className="text-muted-foreground text-xs">{branch.email}</p>}
                    {!branch.phone && !branch.email && '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(branch.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(branch)} className="text-primary hover:underline text-xs flex items-center gap-1">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => remove(branch)} className="text-error hover:underline text-xs flex items-center gap-1">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
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
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {total} total</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-border hover:bg-background disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-border hover:bg-background disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{editing ? 'Edit Branch' : 'New Branch'}</h2>
              <button onClick={closeForm} className="p-1 rounded-lg hover:bg-background">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Organization *</label>
                <select
                  value={form.organizationId}
                  onChange={(e) => setForm({ ...form, organizationId: e.target.value })}
                  disabled={!!editing}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none disabled:opacity-50"
                >
                  <option value="">Select organization</option>
                  {orgs.map((o) => <option key={o._id} value={o._id}>{o.churchName}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Branch Name *</label>
                <input
                  type="text"
                  value={form.branchName}
                  onChange={(e) => setForm({ ...form, branchName: e.target.value })}
                  placeholder="e.g. Downtown Campus"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Downtown"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. +233 24 123 4567"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="branch@church.org"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Full address..."
                  rows={2}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="w-4 h-4 accent-primary"
                />
                <label htmlFor="isDefault" className="text-sm text-foreground">Set as default branch</label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={closeForm}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-background">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
