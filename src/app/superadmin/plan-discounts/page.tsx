'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, Plus, Pencil, Trash2, CheckCircle, X } from 'lucide-react';
import { api } from '@/lib/api';

interface PlanDiscount {
  _id: string;
  name: string;
  planId: string; // 'all' or a paid plan id
  billingCycle: 'monthly' | 'annual' | 'both';
  type: 'percent' | 'fixed';
  value: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

const PLAN_OPTIONS = [
  { value: 'all', label: 'All paid plans' },
  { value: 'growth', label: 'Growth' },
  { value: 'ascend', label: 'Ascend' },
];

const EMPTY_FORM = {
  name: '',
  planId: 'all',
  billingCycle: 'annual' as PlanDiscount['billingCycle'],
  type: 'percent' as PlanDiscount['type'],
  value: '',
  isActive: true,
  startsAt: '',
  endsAt: '',
};

const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

function describe(d: PlanDiscount) {
  return d.type === 'percent' ? `${d.value}% off` : `GHS ${d.value.toLocaleString()} off`;
}

// A discount can be switched on yet not currently apply (outside its dates)
function statusOf(d: PlanDiscount): { label: string; cls: string } {
  if (!d.isActive) return { label: 'Inactive', cls: 'bg-muted text-muted-foreground' };
  const now = Date.now();
  if (d.startsAt && new Date(d.startsAt).getTime() > now) return { label: 'Scheduled', cls: 'bg-warning/10 text-warning' };
  if (d.endsAt && new Date(d.endsAt).getTime() < now) return { label: 'Expired', cls: 'bg-muted text-muted-foreground' };
  return { label: 'Live', cls: 'bg-success/10 text-success' };
}

export default function PlanDiscountsPage() {
  const [discounts, setDiscounts] = useState<PlanDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PlanDiscount | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchDiscounts = useCallback(() => {
    setLoading(true);
    api
      .get('/api/superadmin/plan-discounts')
      .then((r) => setDiscounts(r.data.discounts))
      .catch(() => setError('Failed to load discounts'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDiscounts(); }, [fetchDiscounts]);

  const flash = (text: string, err = false) => {
    setMsg(text); setIsError(err);
    setTimeout(() => setMsg(''), 4000);
  };

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };

  const openEdit = (d: PlanDiscount) => {
    setEditing(d);
    setForm({
      name: d.name,
      planId: d.planId,
      billingCycle: d.billingCycle,
      type: d.type,
      value: String(d.value),
      isActive: d.isActive,
      startsAt: toDateInput(d.startsAt),
      endsAt: toDateInput(d.endsAt),
    });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); };

  const save = async () => {
    if (!form.name.trim() || !form.value) { flash('Name and value are required.', true); return; }
    if (form.type === 'percent' && Number(form.value) > 100) { flash('A percentage cannot exceed 100.', true); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        planId: form.planId,
        billingCycle: form.billingCycle,
        type: form.type,
        value: Number(form.value),
        isActive: form.isActive,
        startsAt: form.startsAt || null,
        // End of the chosen day, so "ends 31 Dec" includes 31 Dec
        endsAt: form.endsAt ? `${form.endsAt}T23:59:59.999Z` : null,
      };
      if (editing) {
        await api.patch(`/api/superadmin/plan-discounts/${editing._id}`, payload);
        flash('Discount updated.');
      } else {
        await api.post('/api/superadmin/plan-discounts', payload);
        flash('Discount created.');
      }
      closeForm();
      fetchDiscounts();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      flash(err.response?.data?.error || 'Failed to save discount.', true);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (d: PlanDiscount) => {
    try {
      await api.patch(`/api/superadmin/plan-discounts/${d._id}`, { isActive: !d.isActive });
      fetchDiscounts();
    } catch {
      flash('Failed to update discount.', true);
    }
  };

  const remove = async (d: PlanDiscount) => {
    if (!window.confirm(`Delete discount "${d.name}"?`)) return;
    try {
      await api.delete(`/api/superadmin/plan-discounts/${d._id}`);
      flash('Discount deleted.');
      fetchDiscounts();
    } catch {
      flash('Failed to delete discount.', true);
    }
  };

  const planLabel = (id: string) => PLAN_OPTIONS.find((p) => p.value === id)?.label || id;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Plan Discounts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Discount subscription prices, e.g. a yearly saving. Where several apply, the biggest saving is used (they don&apos;t stack).
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> New Discount
        </button>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${isError ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
          <CheckCircle className="w-4 h-4" /> {msg}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-error p-4 bg-error/10 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Discount</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Applies to</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Amount</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Dates</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
            ) : discounts.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No discounts yet. Plans are sold at list price.</td></tr>
            ) : discounts.map((d) => {
              const st = statusOf(d);
              return (
                <tr key={d._id} className="border-b border-border last:border-0 hover:bg-background/50">
                  <td className="px-4 py-3 font-medium text-foreground">{d.name}</td>
                  <td className="px-4 py-3 text-foreground">
                    {planLabel(d.planId)} · <span className="capitalize">{d.billingCycle === 'both' ? 'monthly & annual' : d.billingCycle}</span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{describe(d)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {d.startsAt || d.endsAt
                      ? `${d.startsAt ? new Date(d.startsAt).toLocaleDateString() : 'Now'} – ${d.endsAt ? new Date(d.endsAt).toLocaleDateString() : 'No end'}`
                      : 'Always'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleActive(d)} className="text-primary hover:underline text-xs">
                        {d.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => openEdit(d)} className="text-primary hover:underline text-xs flex items-center gap-1">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => remove(d)} className="text-error hover:underline text-xs flex items-center gap-1">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editing ? 'Edit Discount' : 'New Discount'}
              </h2>
              <button onClick={closeForm} className="p-1 rounded-lg hover:bg-background">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Label shown to churches</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Yearly saving"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Plan</label>
                  <select
                    value={form.planId}
                    onChange={(e) => setForm({ ...form, planId: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  >
                    {PLAN_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Billing cycle</label>
                  <select
                    value={form.billingCycle}
                    onChange={(e) => setForm({ ...form, billingCycle: e.target.value as PlanDiscount['billingCycle'] })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  >
                    <option value="annual">Annual</option>
                    <option value="monthly">Monthly</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as PlanDiscount['type'] })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed amount (GHS)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    {form.type === 'percent' ? 'Percent off' : 'GHS off the cycle price'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={form.type === 'percent' ? 100 : undefined}
                    step="0.01"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder={form.type === 'percent' ? 'e.g. 17' : 'e.g. 2000'}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Starts (optional)</label>
                  <input
                    type="date"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Ends (optional)</label>
                  <input
                    type="date"
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 accent-primary"
                />
                <label htmlFor="isActive" className="text-sm text-foreground">Active</label>
              </div>
              <p className="text-xs text-muted-foreground">
                Applies to new purchases and renewals from now on. Churches already paid up keep what they paid.
              </p>
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
