'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LifeBuoy, Plus, Lightbulb, MessageCircle } from 'lucide-react';

import { PageHeader, Badge, EmptyState, Modal } from '@/components/dashboard';
import { Button, Card, Input, Select, Textarea } from '@/components/ui';
import { supportApi } from '@/lib/api';
import type { SupportTicket } from '@/types';

const typeOptions = [
  { value: 'support', label: 'Support ticket' },
  { value: 'feature_request', label: 'Feature request' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

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

export default function SupportPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [type, setType] = useState<'support' | 'feature_request'>('support');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const { data, isLoading } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: () => supportApi.list(),
  });
  const tickets: SupportTicket[] = data?.tickets ?? [];

  const resetForm = () => {
    setType('support');
    setSubject('');
    setDescription('');
    setPriority('medium');
  };

  const createMutation = useMutation({
    mutationFn: () => supportApi.create({ type, subject: subject.trim(), description, priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('Ticket submitted');
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to submit ticket'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error('Subject and description are required');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        description="Get help from the Sanctuary Connect team, or suggest a feature"
        actionLabel="New Ticket"
        actionIcon={Plus}
        onAction={() => setModalOpen(true)}
      />

      <Card padding="none">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title="No tickets yet"
            description="Have a question, ran into an issue, or want to request a feature? Submit a ticket and our team will get back to you."
            actionLabel="New Ticket"
            onAction={() => setModalOpen(true)}
          />
        ) : (
          <div className="divide-y divide-border">
            {tickets.map((ticket) => (
              <Link
                key={ticket._id}
                href={`/dashboard/support/${ticket._id}`}
                className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-background transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {ticket.type === 'feature_request' ? (
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    ) : (
                      <LifeBuoy className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    )}
                    <p className="text-sm font-medium text-foreground truncate">{ticket.subject}</p>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                    {ticket.replies.length > 0 && (
                      <span className="inline-flex items-center gap-1 ml-2">
                        <MessageCircle className="w-3 h-3" /> {ticket.replies.length}
                      </span>
                    )}
                  </p>
                </div>
                <Badge variant={statusBadgeVariant[ticket.status]}>{statusLabel[ticket.status]}</Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title="New Ticket"
        description="Tell us what's going on - we'll get back to you as soon as we can"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Type"
            options={typeOptions}
            value={type}
            onChange={(e) => setType(e.target.value as 'support' | 'feature_request')}
          />
          <Input
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary"
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's happening? Include any details that would help us."
              rows={5}
            />
          </div>
          <Select
            label="Priority"
            options={priorityOptions}
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => { setModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Submit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
