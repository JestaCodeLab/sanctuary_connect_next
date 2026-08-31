'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, LifeBuoy, Lightbulb, Send } from 'lucide-react';

import { Badge } from '@/components/dashboard';
import { Button, Card, Textarea } from '@/components/ui';
import { supportApi } from '@/lib/api';
import type { SupportTicket } from '@/types';

const statusBadgeVariant: Record<SupportTicket['status'], 'info' | 'warning' | 'success' | 'muted'> = {
  open: 'info',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'muted',
};

const statusLabel: Record<SupportTicket['status'], string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export default function SupportTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['support-ticket', id],
    queryFn: () => supportApi.get(id),
    enabled: !!id,
  });
  const ticket = data?.ticket;

  const replyMutation = useMutation({
    mutationFn: () => supportApi.reply(id, reply.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      setReply('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to send reply'),
  });

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    replyMutation.mutate();
  };

  if (isLoading) {
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
        <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/dashboard/support')}>
          Back to Support
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <button
        onClick={() => router.push('/dashboard/support')}
        className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Support
      </button>

      <Card>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            {ticket.type === 'feature_request' ? (
              <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0" />
            ) : (
              <LifeBuoy className="w-4 h-4 text-primary flex-shrink-0" />
            )}
            <h1 className="text-lg font-semibold text-foreground truncate">{ticket.subject}</h1>
          </div>
          <Badge variant={statusBadgeVariant[ticket.status]}>{statusLabel[ticket.status]}</Badge>
        </div>
        <p className="text-sm text-muted mb-1">
          {ticket.type === 'feature_request' ? 'Feature Request' : 'Support Ticket'} · Submitted {new Date(ticket.createdAt).toLocaleString()}
        </p>
        <p className="text-sm text-foreground whitespace-pre-wrap mt-4">{ticket.description}</p>
      </Card>

      {ticket.replies.length > 0 && (
        <div className="space-y-3">
          {ticket.replies.map((r, i) => (
            <Card key={i} padding="sm" className={r.authorRole === 'superadmin' ? 'bg-primary-light border-primary/20' : ''}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-foreground">
                  {r.authorRole === 'superadmin' ? 'Sanctuary Connect Support' : r.authorName}
                </p>
                <p className="text-xs text-muted">{new Date(r.createdAt).toLocaleString()}</p>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{r.message}</p>
            </Card>
          ))}
        </div>
      )}

      {ticket.status === 'closed' ? (
        <p className="text-sm text-muted text-center py-4">This ticket is closed. Submit a new ticket if you need further help.</p>
      ) : (
        <form onSubmit={handleReply} className="space-y-3">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply..."
            rows={3}
          />
          <div className="flex justify-end">
            <Button type="submit" isLoading={replyMutation.isPending} disabled={!reply.trim()}>
              <Send className="w-3.5 h-3.5 mr-1.5" /> Send Reply
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
