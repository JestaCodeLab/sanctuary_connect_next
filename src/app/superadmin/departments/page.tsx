'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, AlertCircle, ChevronLeft, ChevronRight, Plus, X, CheckCircle, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Department {
  _id: string;
  organizationId: { _id: string; churchName: string };
  branchId: { _id: string; branchName: string };
  departmentName: string;
  description?: string;
  leaderId?: { _id: string; firstName: string; lastName: string };
  createdAt: string;
}

interface DepartmentForm {
  organizationId: string;
  branchId: string;
  departmentName: string;
  description: string;
  leaderId: string;
}

const EMPTY_FORM: DepartmentForm = {
  organizationId: '',
  branchId: '',
  departmentName: '',
  description: '',
  leaderId: '',
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [orgId, setOrgId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState<DepartmentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  
  const [orgs, setOrgs] = useState<Array<{_id: string; churchName: string}>>([]);
  const [branches, setBranches] = useState<Array<{_id: string; branchName: string}>>([]);

  const limit = 20;

  const fetchDepartments = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (orgId) params.set('orgId', orgId);
    api
      .get(`/api/superadmin/departments?${params}`)
      .then((r) => { setDepartments(r.data.departments); setTotal(r.data.total); })
      .catch(() => setError('Failed to load departments'))
      .finally(() => setLoading(false));
  }, [page, search, orgId]);

  const fetchOrgs = useCallback(() => {
    api.get('/api/superadmin/organizations?limit=1000')
      .then((r) => setOrgs(r.data.orgs.map((o: any) => ({ _id: o._id, churchName: o.churchName }))))
      .catch(() => {});
  }, []);

  const fetchBranches = useCallback((selectedOrgId: string) => {
    if (!selectedOrgId) { setBranches([]); return; }
    api.get(`/api/superadmin/branches?orgId=${selectedOrgId}&limit=1000`)
      .then((r) => setBranches(r.data.branches.map((b: any) => ({ _id: b._id, branchName: b.branchName }))))
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);
  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);
  useEffect(() => { setPage(1); }, [search, orgId]);
  useEffect(() => {
    if (form.organizationId) fetchBranches(form.organizationId);
  }, [form.organizationId, fetchBranches]);

  const flash = (text: string, err = false) => {
    setMsg(text); setIsError(err);
    setTimeout(() => setMsg(''), 4000);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setBranches([]);
    setShowForm(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setForm({
      organizationId: dept.organizationId._id,
      branchId: dept.branchId._id,
      departmentName: dept.departmentName,
      description: dept.description || '',
      leaderId: dept.leaderId?._id || '',
    });
    fetchBranches(dept.organizationId._id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setBranches([]);
  };

  const save = async () => {
    if (!form.organizationId || !form.branchId || !form.departmentName) {
      flash('Organization, branch, and department name are required.', true);
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, leaderId: form.leaderId || undefined };
      if (editing) {
        await api.patch(`/api/superadmin/departments/${editing._id}`, payload);
        flash('Department updated.');
      } else {
        await api.post('/api/superadmin/departments', payload);
        flash('Department created.');
      }
      closeForm();
      fetchDepartments();
    } catch (err: any) {
      flash(err.response?.data?.error || 'Failed to save department.', true);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (dept: Department) => {
    if (!window.confirm(`Delete department "${dept.departmentName}"?`)) return;
    try {
      await api.delete(`/api/superadmin/departments/${dept._id}`);
      flash('Department deleted.');
      fetchDepartments();
    } catch (err: any) {
      flash(err.response?.data?.error || 'Failed to delete department.', true);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Departments</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} departments</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> New Department
        </button>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${isError ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
          <CheckCircle className="w-4 h-4" /> {msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 flex-1">
          <Search className="w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search departments..."
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

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Department</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Organization</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Branch</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Leader</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
              ) : departments.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No departments found</td></tr>
              ) : departments.map((dept) => (
                <tr key={dept._id} className="border-b border-border last:border-0 hover:bg-background/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{dept.departmentName}</p>
                    {dept.description && <p className="text-xs text-muted-foreground">{dept.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-foreground">{dept.organizationId?.churchName || '—'}</td>
                  <td className="px-4 py-3 text-foreground">{dept.branchId?.branchName || '—'}</td>
                  <td className="px-4 py-3 text-foreground">
                    {dept.leaderId ? `${dept.leaderId.firstName} ${dept.leaderId.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(dept.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(dept)} className="text-primary hover:underline text-xs flex items-center gap-1">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => remove(dept)} className="text-error hover:underline text-xs flex items-center gap-1">
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

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{editing ? 'Edit Department' : 'New Department'}</h2>
              <button onClick={closeForm} className="p-1 rounded-lg hover:bg-background">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Organization *</label>
                <select
                  value={form.organizationId}
                  onChange={(e) => setForm({ ...form, organizationId: e.target.value, branchId: '' })}
                  disabled={!!editing}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none disabled:opacity-50"
                >
                  <option value="">Select organization</option>
                  {orgs.map((o) => <option key={o._id} value={o._id}>{o.churchName}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Branch *</label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  disabled={!form.organizationId || !!editing}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none disabled:opacity-50"
                >
                  <option value="">Select branch</option>
                  {branches.map((b) => <option key={b._id} value={b._id}>{b.branchName}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Department Name *</label>
                <input
                  type="text"
                  value={form.departmentName}
                  onChange={(e) => setForm({ ...form, departmentName: e.target.value })}
                  placeholder="e.g. Youth Ministry"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description..."
                  rows={2}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none resize-none"
                />
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
