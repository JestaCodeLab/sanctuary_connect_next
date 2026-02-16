'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { MessageSquare, Send, Mail, Smartphone, Users, Trash2 } from 'lucide-react';

import { PageHeader, StatsGrid, Badge, Modal, EmptyState } from '@/components/dashboard';
import { Card, Button, Input, Select } from '@/components/ui';
import { messagesApi } from '@/lib/api';
import { messageSchema } from '@/lib/validations';
import type { MessageFormData } from '@/lib/validations';
import type { Message } from '@/types';

const statusBadgeVariant: Record<string, 'success' | 'muted' | 'info'> = {
  sent: 'success',
  draft: 'muted',
  scheduled: 'info',
};

const filterTabs = ['All', 'Sent', 'Drafts', 'Scheduled'] as const;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getRecipientLabel(msg: Message): string {
  if (msg.recipientType === 'all') return 'All Members';
  return `${msg.recipientCount} recipients`;
}

export default function CommunicationPage() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: messagesApi.getAll,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema) as any,
  });

  const createMutation = useMutation({
    mutationFn: messagesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Message created');
      setIsModalOpen(false);
      reset();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to create message';
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: messagesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Message deleted');
      setDeleteId(null);
    },
  });

  const onSubmit = (data: MessageFormData) => {
    createMutation.mutate({
      subject: data.subject,
      body: data.body,
      recipientType: data.recipientType,
      channel: data.channel,
      status: 'draft',
    });
  };

  const filteredMessages = messages.filter((msg: Message) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Sent') return msg.status === 'sent';
    if (activeFilter === 'Drafts') return msg.status === 'draft';
    if (activeFilter === 'Scheduled') return msg.status === 'scheduled';
    return true;
  });

  const sentCount = messages.filter((m: Message) => m.status === 'sent').length;
  const draftCount = messages.filter((m: Message) => m.status === 'draft').length;
  const scheduledCount = messages.filter((m: Message) => m.status === 'scheduled').length;

  const stats = [
    { label: 'Messages Sent', value: sentCount, icon: MessageSquare },
    { label: 'Drafts', value: draftCount, icon: Mail },
    { label: 'Scheduled', value: scheduledCount, icon: Smartphone },
    { label: 'Total Messages', value: messages.length, icon: Users },
  ];

  const messageToDelete = deleteId
    ? messages.find((m: Message) => m._id === deleteId)
    : null;

  return (
    <div>
      <PageHeader
        title="Communication"
        description="Send messages and announcements to your congregation"
        actionLabel="New Message"
        actionIcon={Send}
        onAction={() => setIsModalOpen(true)}
      />

      <StatsGrid stats={stats} />

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1 mb-6 w-fit">
        {filterTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              activeFilter === tab
                ? 'bg-primary text-white'
                : 'text-muted hover:text-foreground hover:bg-card'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Message List */}
      {isLoading ? (
        <Card padding="lg">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </Card>
      ) : filteredMessages.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={MessageSquare}
            title="No messages found"
            description={
              activeFilter !== 'All'
                ? 'Try adjusting your filter.'
                : 'Create your first message to get started.'
            }
            actionLabel={activeFilter === 'All' ? 'New Message' : undefined}
            onAction={activeFilter === 'All' ? () => setIsModalOpen(true) : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredMessages.map((msg: Message) => (
            <Card key={msg._id} padding="md" className="hover:shadow-sm transition-shadow">
              {/* Top Row: Subject + Status */}
              <div className="flex items-center justify-between gap-4 mb-1">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {msg.subject}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant={statusBadgeVariant[msg.status] || 'muted'}>
                    {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(msg._id)}
                    aria-label={`Delete ${msg.subject}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>

              {/* Body Preview */}
              <p className="text-sm text-muted line-clamp-1 mb-3">
                {msg.body}
              </p>

              {/* Bottom Row: Channel + Recipients | Date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={msg.channel === 'email' ? 'info' : msg.channel === 'sms' ? 'warning' : 'muted'}>
                    <span className="flex items-center gap-1">
                      {msg.channel === 'email' ? (
                        <Mail className="w-3 h-3" />
                      ) : (
                        <Smartphone className="w-3 h-3" />
                      )}
                      {msg.channel === 'email' ? 'Email' : msg.channel === 'sms' ? 'SMS' : 'In-App'}
                    </span>
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {getRecipientLabel(msg)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {msg.status === 'sent' && msg.sentAt
                    ? `Sent ${formatDateTime(msg.sentAt)}`
                    : msg.status === 'scheduled' && msg.scheduledAt
                      ? `Scheduled for ${formatDateTime(msg.scheduledAt)}`
                      : `Created ${formatDate(msg.createdAt)}`}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Message Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          reset();
        }}
        title="New Message"
        description="Compose a message for your congregation."
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Subject"
            error={errors.subject?.message}
            {...register('subject')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Message Body
            </label>
            <textarea
              className={`block w-full rounded-lg border bg-white dark:bg-gray-800 px-3 py-2.5
                text-gray-900 dark:text-gray-100 transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-[#3AAFDC] focus:border-transparent
                ${errors.body ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              rows={4}
              {...register('body')}
            />
            {errors.body && (
              <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">{errors.body.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Recipient Type"
              options={[
                { value: 'all', label: 'All Members' },
                { value: 'branch', label: 'Branch' },
                { value: 'group', label: 'Group' },
                { value: 'individual', label: 'Individual' },
              ]}
              error={errors.recipientType?.message}
              {...register('recipientType')}
            />

            <Select
              label="Channel"
              options={[
                { value: 'email', label: 'Email' },
                { value: 'sms', label: 'SMS' },
                { value: 'in-app', label: 'In-App' },
              ]}
              error={errors.channel?.message}
              {...register('channel')}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={createMutation.isPending}
            >
              Save as Draft
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Message"
        description="This action cannot be undone."
        size="sm"
      >
        <div>
          <p className="text-sm text-muted mb-6">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-foreground">
              {messageToDelete ? messageToDelete.subject : 'this message'}
            </span>
            ?
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="!bg-red-600 hover:!bg-red-700 focus:!ring-red-500"
              isLoading={deleteMutation.isPending}
              onClick={() => {
                if (deleteId) {
                  deleteMutation.mutate(deleteId);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
