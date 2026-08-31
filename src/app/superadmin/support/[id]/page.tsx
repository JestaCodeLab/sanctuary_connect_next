'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, LifeBuoy, Lightbulb, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { SupportTicket } from '@/types';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-600',
  in_progress: 'bg-amber-500/10 text-amber-600',
  resolved: 'bg-success/10 text-success',
  closed: 'bg-muted/50 text-muted-foreground',
};

export default function SuperadminSupportTicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchTicket = useCallback(() => {
    setLoading(true);
    api
      .get(`/api/superadmin/support/${id}`)
      .then((r) => setTicket(r.data.ticket))
      .catch(() => toast.error('Failed to load ticket'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setIsReplying(true);
    try {
      const { data } = await api.post(`/api/superadmin/support/${id}/replies`, { message: reply.trim() });
      setTicket(data.ticket);
      setReply('');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to send reply');
    } finally {
      setIsReplying(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!ticket || status === ticket.status) return;
    setIsUpdatingStatus(true);
    try {
      const { data } = await api.patch(`/api/superadmin/support/${id}/status`, { status });
      setTicket(data.ticket);
      toast.success('Status updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-16">
        <p className="text-foreground font-medium">Ticket not found</p>
        <button
          onClick={() => router.push('/superadmin/support')}
          className="mt-4 px-4 py-2 rounded-lg border border-border hover:bg-background text-sm"
        >
          Back to Support
        </button>
      </div>
    );
  }

  const org = typeof ticket.organizationId === 'object' ? ticket.organizationId : null;
  const submitter = typeof ticket.createdBy === 'object' ? ticket.createdBy : null;

  return (
    <div className="space-y-5 max-w-3xl">
      <button
        onClick={() => router.push('/superadmin/support')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Support
      </button>

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {ticket.type === 'feature_request' ? (
              <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0" />
            ) : (
              <LifeBuoy className="w-4 h-4 text-primary flex-shrink-0" />
            )}
            <h1 className="text-lg font-semibold text-foreground truncate">{ticket.subject}</h1>
          </div>
          <select
            value={ticket.status}
            disabled={isUpdatingStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border-0 ${STATUS_COLORS[ticket.status]}`}
          >
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <p className="text-sm text-muted-foreground mb-1">
          {org?.churchName ?? 'Unknown organization'} · {submitter ? `${submitter.firstName} ${submitter.lastName} (${submitter.email})` : 'Unknown submitter'}
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          {ticket.type === 'feature_request' ? 'Feature Request' : 'Support Ticket'} · Priority: {ticket.priority} · Submitted {new Date(ticket.createdAt).toLocaleString()}
        </p>
        <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {ticket.replies.length > 0 && (
        <div className="space-y-3">
          {ticket.replies.map((r, i) => (
            <div
              key={i}
              className={`rounded-xl border p-4 ${r.authorRole === 'superadmin' ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-foreground">
                  {r.authorRole === 'superadmin' ? 'Support Team (you)' : r.authorName}
                </p>
                <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</p>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{r.message}</p>
            </div>
          ))}
        </div>
      )}

      {ticket.status === 'closed' ? (
        <p className="text-sm text-muted-foreground text-center py-4">This ticket is closed.</p>
      ) : (
        <form onSubmit={handleReply} className="space-y-3">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!reply.trim() || isReplying}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" /> {isReplying ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
