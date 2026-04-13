'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, CheckCircle, Plus, Minus } from 'lucide-react';
import { api } from '@/lib/api';

interface CreditRow {
  _id: string;
  merchantId: { _id: string; churchName: string } | null;
  balance: number;
  totalPurchased: number;
  totalUsed: number;
  updatedAt: string;
}

export default function SmsCreditsPage() {
  const [credits, setCredits] = useState<CreditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 20;

  // Adjust modal
  const [adjusting, setAdjusting] = useState<CreditRow | null>(null);
  const [amount, setAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'bonus' | 'usage'>('bonus');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const fetchCredits = useCallback(() => {
    setLoading(true);
    api
      .get(`/api/superadmin/sms-credits?page=${page}&limit=${limit}`)
      .then((r) => { setCredits(r.data.credits); setTotal(r.data.total); })
      .catch(() => setError('Failed to load SMS credits'))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetchCredits(); }, [fetchCredits]);

  const openAdjust = (row: CreditRow) => {
    setAdjusting(row);
    setAmount('');
    setAdjustType('bonus');
    setDescription('');
    setSaveMsg('');
  };

  const saveAdjust = async () => {
    if (!adjusting || !amount) return;
    const parsed = Number(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setSaveMsg('Enter a positive number.');
      return;
    }
    setSaving(true);
    setSaveMsg('');
    try {
      await api.patch(`/api/superadmin/sms-credits/${adjusting.merchantId?._id}`, {
        amount: parsed,
        type: adjustType,
        description: description || undefined,
      });
      setSaveMsg('Credits updated.');
      fetchCredits();
      setTimeout(() => setAdjusting(null), 1200);
    } catch {
      setSaveMsg('Failed to adjust credits.');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">SMS Credits</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage SMS credit balances across all churches</p>
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
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Balance</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Purchased</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Used</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Last Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
              ) : credits.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No credit accounts found</td></tr>
              ) : credits.map((row) => (
                <tr key={row._id} className="border-b border-border last:border-0 hover:bg-background/50">
                  <td className="px-4 py-3 font-medium text-foreground">{row.merchantId?.churchName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${row.balance < 50 ? 'text-error' : 'text-foreground'}`}>
                      {row.balance.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.totalPurchased.toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.totalUsed.toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(row.updatedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openAdjust(row)} className="text-primary text-xs hover:underline">Adjust</button>
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

      {/* Adjust Modal */}
      {adjusting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Adjust Credits — {adjusting.merchantId?.churchName}
            </h2>
            <p className="text-sm text-muted-foreground">
              Current balance: <span className="font-semibold text-foreground">{adjusting.balance.toLocaleString()}</span>
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Operation</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAdjustType('bonus')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      adjustType === 'bonus'
                        ? 'bg-success/10 border-success text-success'
                        : 'border-border text-muted-foreground hover:bg-background'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                  <button
                    onClick={() => setAdjustType('usage')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      adjustType === 'usage'
                        ? 'bg-error/10 border-error text-error'
                        : 'border-border text-muted-foreground hover:bg-background'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" /> Deduct
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Amount</label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Complimentary top-up"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                />
              </div>
            </div>

            {saveMsg && (
              <div className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                saveMsg.includes('Failed') || saveMsg.includes('positive')
                  ? 'bg-error/10 text-error'
                  : 'bg-success/10 text-success'
              }`}>
                <CheckCircle className="w-4 h-4" /> {saveMsg}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setAdjusting(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-background">
                Cancel
              </button>
              <button onClick={saveAdjust} disabled={saving || !amount}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 disabled:opacity-50">
                {saving ? 'Saving...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
