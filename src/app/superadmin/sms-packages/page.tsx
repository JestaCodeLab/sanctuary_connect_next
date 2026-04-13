'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, Plus, Pencil, Trash2, CheckCircle, X } from 'lucide-react';
import { api } from '@/lib/api';

interface SmsPackage {
  _id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  isActive: boolean;
}

const EMPTY_FORM = { name: '', credits: '', price: '', currency: 'GHS', isActive: true };

export default function SmsPackagesPage() {
  const [packages, setPackages] = useState<SmsPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SmsPackage | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchPackages = useCallback(() => {
    setLoading(true);
    api
      .get('/api/superadmin/sms-packages')
      .then((r) => setPackages(r.data.packages))
      .catch(() => setError('Failed to load SMS packages'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  const flash = (text: string, err = false) => {
    setMsg(text); setIsError(err);
    setTimeout(() => setMsg(''), 4000);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (pkg: SmsPackage) => {
    setEditing(pkg);
    setForm({ name: pkg.name, credits: String(pkg.credits), price: String(pkg.price), currency: pkg.currency, isActive: pkg.isActive });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); };

  const save = async () => {
    if (!form.name || !form.credits || !form.price) {
      flash('Name, credits and price are required.', true); return;
    }
    setSaving(true);
    try {
      const payload = { name: form.name, credits: Number(form.credits), price: Number(form.price), currency: form.currency, isActive: form.isActive };
      if (editing) {
        await api.patch(`/api/superadmin/sms-packages/${editing._id}`, payload);
        flash('Package updated.');
      } else {
        await api.post('/api/superadmin/sms-packages', payload);
        flash('Package created.');
      }
      closeForm();
      fetchPackages();
    } catch {
      flash('Failed to save package.', true);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (pkg: SmsPackage) => {
    if (!window.confirm(`Delete package "${pkg.name}"?`)) return;
    try {
      await api.delete(`/api/superadmin/sms-packages/${pkg._id}`);
      flash('Package deleted.');
      fetchPackages();
    } catch {
      flash('Failed to delete package.', true);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SMS Packages</h1>
          <p className="text-muted-foreground text-sm mt-1">Define credit bundles churches can purchase</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> New Package
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
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Package</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Credits</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Price</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
            ) : packages.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No packages yet. Create your first one.</td></tr>
            ) : packages.map((pkg) => (
              <tr key={pkg._id} className="border-b border-border last:border-0 hover:bg-background/50">
                <td className="px-4 py-3 font-medium text-foreground">{pkg.name}</td>
                <td className="px-4 py-3 text-foreground">{pkg.credits.toLocaleString()} credits</td>
                <td className="px-4 py-3 text-foreground">{pkg.currency} {pkg.price.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pkg.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {pkg.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEdit(pkg)} className="text-primary hover:underline text-xs flex items-center gap-1">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => remove(pkg)} className="text-error hover:underline text-xs flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editing ? 'Edit Package' : 'New SMS Package'}
              </h2>
              <button onClick={closeForm} className="p-1 rounded-lg hover:bg-background">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Package Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Starter Bundle"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Credits</label>
                  <input
                    type="number"
                    min="1"
                    value={form.credits}
                    onChange={(e) => setForm({ ...form, credits: e.target.value })}
                    placeholder="e.g. 500"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="e.g. 50"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  />
                </div>
              </div>
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
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 accent-primary"
                />
                <label htmlFor="isActive" className="text-sm text-foreground">Active (visible to churches)</label>
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
