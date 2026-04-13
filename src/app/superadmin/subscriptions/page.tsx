'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ChevronLeft, ChevronRight, CheckCircle, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

interface SubRow {
  _id: string;
  organizationId: { _id: string; churchName: string; logoUrl?: string };
  planId: string;
  status: string;
  billingCycle: string;
  currentPeriodEnd: string;
}

const PLANS = ['seed', 'growth', 'ascend', 'sanctuary'];
const STATUSES = ['active', 'cancelled', 'past_due', 'trialing', 'paused'];

const PLAN_COLORS: Record<string, string> = {
  seed: 'bg-muted text-muted-foreground',
  growth: 'bg-blue-500/10 text-blue-600',
  ascend: 'bg-purple-500/10 text-purple-600',
  sanctuary: 'bg-amber-500/10 text-amber-600',
};

export default function SubscriptionsPage() {
  const searchParams = useSearchParams();
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit modal state
  const [editing, setEditing] = useState<SubRow | null>(null);
  const [editPlan, setEditPlan] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editPeriodEnd, setEditPeriodEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const limit = 20;

  const fetchSubs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filterPlan) params.set('plan', filterPlan);
    if (filterStatus) params.set('status', filterStatus);
    api
      .get(`/api/superadmin/subscriptions?${params}`)
      .then((r) => { setSubs(r.data.subs); setTotal(r.data.total); })
      .catch(() => setError('Failed to load subscriptions'))
      .finally(() => setLoading(false));
  }, [page, filterPlan, filterStatus]);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);
  useEffect(() => { setPage(1); }, [filterPlan, filterStatus]);

  const openEdit = (sub: SubRow) => {
    setEditing(sub);
    setEditPlan(sub.planId);
    setEditStatus(sub.status);
    setEditPeriodEnd(sub.currentPeriodEnd.slice(0, 10));
    setSaveMsg('');
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await api.patch(`/api/superadmin/subscriptions/${editing.organizationId._id}`, {
        planId: editPlan,
        status: editStatus,
        currentPeriodEnd: editPeriodEnd,
      });
      setSaveMsg('Subscription updated.');
      fetchSubs();
      setTimeout(() => setEditing(null), 1200);
    } catch {
      setSaveMsg('Failed to update subscription.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSub = async (sub: SubRow) => {
    const confirmed = window.confirm(
      `Delete subscription for "${sub.organizationId.churchName}"? This will unlink the subscription from the organization.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/api/superadmin/subscriptions/${sub._id}`);
      setSaveMsg('Subscription deleted successfully.');
      fetchSubs();
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err: any) {
      setSaveMsg(err.response?.data?.error || 'Failed to delete subscription.');
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Subscriptions</h1>
        <p className="text-muted-foreground text-sm mt-1">{total} subscriptions</p>
      </div>
      
      {saveMsg && (
        <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
          saveMsg.includes('Failed') || saveMsg.includes('error') ? 'bg-error/10 text-error' : 'bg-success/10 text-success'
        }`}>
          <CheckCircle className="w-4 h-4" /> {saveMsg}
        </div>
      )}

      <div className="flex gap-3">
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
        >
          <option value="">All plans</option>
          {PLANS.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
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
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Church</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Plan</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Billing</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Period End</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
              ) : subs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No subscriptions found</td></tr>
              ) : subs.map((sub) => (
                <tr key={sub._id} className="border-b border-border last:border-0 hover:bg-background/50">
                  <td className="px-4 py-3 font-medium text-foreground">{sub.organizationId?.churchName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PLAN_COLORS[sub.planId] ?? ''}`}>
                      {sub.planId}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      sub.status === 'active' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{sub.billingCycle}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(sub.currentPeriodEnd).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(sub)} className="text-primary text-xs hover:underline">Edit</button>
                      <button onClick={() => deleteSub(sub)} className="text-error text-xs hover:underline flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Delete
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
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
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

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Edit — {editing.organizationId.churchName}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Plan</label>
                <select value={editPlan} onChange={(e) => setEditPlan(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none">
                  {PLANS.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Status</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none">
                  {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Period End</label>
                <input type="date" value={editPeriodEnd} onChange={(e) => setEditPeriodEnd(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none" />
              </div>
            </div>

            {saveMsg && (
              <div className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                saveMsg.includes('Failed') ? 'bg-error/10 text-error' : 'bg-success/10 text-success'
              }`}>
                <CheckCircle className="w-4 h-4" /> {saveMsg}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-background">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={saving}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
