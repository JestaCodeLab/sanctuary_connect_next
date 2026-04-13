'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, AlertCircle, ChevronLeft, ChevronRight, CheckCircle, Pencil, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';

interface Member {
  _id: string;
  organizationId: { _id: string; churchName: string };
  branchId: { _id: string; branchName: string };
  departmentId?: { _id: string; departmentName: string };
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  membershipStatus?: string;
  dateOfBirth?: string;
  gender?: string;
  createdAt: string;
}

interface MemberForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  address: string;
  branchId: string;
  departmentId: string;
  membershipStatus: string;
}

const EMPTY_FORM: MemberForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  maritalStatus: '',
  address: '',
  branchId: '',
  departmentId: '',
  membershipStatus: 'active',
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [orgId, setOrgId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState<MemberForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  
  const [orgs, setOrgs] = useState<Array<{_id: string; churchName: string}>>([]);

  const limit = 20;

  const fetchMembers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (orgId) params.set('orgId', orgId);
    api
      .get(`/api/superadmin/members?${params}`)
      .then((r) => { setMembers(r.data.members); setTotal(r.data.total); })
      .catch(() => setError('Failed to load members'))
      .finally(() => setLoading(false));
  }, [page, search, orgId]);

  const fetchOrgs = useCallback(() => {
    api.get('/api/superadmin/organizations?limit=1000')
      .then((r) => setOrgs(r.data.orgs.map((o: any) => ({ _id: o._id, churchName: o.churchName }))))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);
  useEffect(() => { setPage(1); }, [search, orgId]);

  const flash = (text: string, err = false) => {
    setMsg(text); setIsError(err);
    setTimeout(() => setMsg(''), 4000);
  };

  const openEdit = (member: Member) => {
    setEditing(member);
    setForm({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email || '',
      phone: member.phone || '',
      dateOfBirth: member.dateOfBirth?.slice(0, 10) || '',
      gender: member.gender || '',
      maritalStatus: '',
      address: '',
      branchId: member.branchId._id,
      departmentId: member.departmentId?._id || '',
      membershipStatus: member.membershipStatus || 'active',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const save = async () => {
    if (!form.firstName || !form.lastName) {
      flash('First name and last name are required.', true);
      return;
    }
    if (!editing) {
      flash('Creating members not yet supported. Edit existing members only.', true);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        departmentId: form.departmentId || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
      };
      await api.patch(`/api/superadmin/members/${editing._id}`, payload);
      flash('Member updated.');
      closeForm();
      fetchMembers();
    } catch (err: any) {
      flash(err.response?.data?.error || 'Failed to update member.', true);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (member: Member) => {
    if (!window.confirm(`Delete member "${member.firstName} ${member.lastName}"?`)) return;
    try {
      await api.delete(`/api/superadmin/members/${member._id}`);
      flash('Member deleted.');
      fetchMembers();
    } catch (err: any) {
      flash(err.response?.data?.error || 'Failed to delete member.', true);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Members</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} members across all organizations</p>
        </div>
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
            placeholder="Search members by name, email, phone..."
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
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Name</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Organization</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Branch</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Department</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Contact</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No members found</td></tr>
              ) : members.map((member) => (
                <tr key={member._id} className="border-b border-border last:border-0 hover:bg-background/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{member.firstName} {member.lastName}</p>
                    {member.gender && <span className="text-xs text-muted-foreground capitalize">{member.gender}</span>}
                  </td>
                  <td className="px-4 py-3 text-foreground">{member.organizationId?.churchName || '—'}</td>
                  <td className="px-4 py-3 text-foreground">{member.branchId?.branchName || '—'}</td>
                  <td className="px-4 py-3 text-foreground">{member.departmentId?.departmentName || '—'}</td>
                  <td className="px-4 py-3">
                    {member.email && <p className="text-foreground text-xs">{member.email}</p>}
                    {member.phone && <p className="text-muted-foreground text-xs">{member.phone}</p>}
                    {!member.email && !member.phone && '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      member.membershipStatus === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                    }`}>
                      {member.membershipStatus || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(member)} className="text-primary hover:underline text-xs flex items-center gap-1">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => remove(member)} className="text-error hover:underline text-xs flex items-center gap-1">
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

      {showForm && editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Edit Member</h2>
              <button onClick={closeForm} className="p-1 rounded-lg hover:bg-background">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">First Name *</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Marital Status</label>
                  <select
                    value={form.maritalStatus}
                    onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  >
                    <option value="">Select</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Membership Status</label>
                  <select
                    value={form.membershipStatus}
                    onChange={(e) => setForm({ ...form, membershipStatus: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="visitor">Visitor</option>
                    <option value="new-convert">New Convert</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
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
                {saving ? 'Saving...' : 'Update Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
