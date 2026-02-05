'use client';

import { useState } from 'react';
import { MessageSquare, Send, Mail, Smartphone, Users, Info } from 'lucide-react';
import toast from 'react-hot-toast';

import { PageHeader, StatsGrid, Badge } from '@/components/dashboard';
import { Card, Button } from '@/components/ui';
import type { Message } from '@/types';

const mockMessages: Message[] = [
  { _id: '1', subject: 'Sunday Service Update', body: 'Dear members, this Sunday we will be having a special guest speaker...', recipientType: 'all', recipientCount: 245, channel: 'email', status: 'sent', sentAt: '2026-02-01T10:00:00Z', createdAt: '2026-02-01' },
  { _id: '2', subject: 'Youth Camp Registration Open', body: 'Registration for the annual youth camp is now open. Please sign up before...', recipientType: 'group', recipientCount: 60, channel: 'sms', status: 'sent', sentAt: '2026-01-28T14:00:00Z', createdAt: '2026-01-28' },
  { _id: '3', subject: 'Building Fund Progress Report', body: 'We are excited to share that our building fund has reached 75% of its goal...', recipientType: 'all', recipientCount: 245, channel: 'email', status: 'scheduled', scheduledAt: '2026-02-10T09:00:00Z', createdAt: '2026-01-25' },
  { _id: '4', subject: 'Volunteer Appreciation Dinner', body: 'You are cordially invited to our annual volunteer appreciation dinner...', recipientType: 'group', recipientCount: 35, channel: 'email', status: 'draft', createdAt: '2026-01-20' },
  { _id: '5', subject: 'Prayer Meeting Reminder', body: 'Reminder: Weekly prayer meeting every Wednesday at 7 PM...', recipientType: 'all', recipientCount: 245, channel: 'sms', status: 'sent', sentAt: '2026-01-15T08:00:00Z', createdAt: '2026-01-15' },
];

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
  const [activeFilter, setActiveFilter] = useState<string>('All');

  const filteredMessages = mockMessages.filter((msg) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Sent') return msg.status === 'sent';
    if (activeFilter === 'Drafts') return msg.status === 'draft';
    if (activeFilter === 'Scheduled') return msg.status === 'scheduled';
    return true;
  });

  const stats = [
    { label: 'Messages Sent', value: 42, icon: MessageSquare },
    { label: 'SMS Credits', value: 150, icon: Smartphone },
    { label: 'Email Open Rate', value: '68%', icon: Mail },
    { label: 'Active Campaigns', value: 3, icon: Users },
  ];

  return (
    <div>
      <PageHeader
        title="Communication"
        description="Send messages and announcements to your congregation"
        actionLabel="New Message"
        actionIcon={Send}
        onAction={() => toast('Backend integration coming soon')}
      />

      {/* Info Banner */}
      <Card className="bg-primary-light border-primary mb-6" padding="md">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0" />
          <p className="text-sm text-primary">
            Communication backend is coming soon. The data shown below is for preview purposes.
          </p>
        </div>
      </Card>

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
      <div className="space-y-3">
        {filteredMessages.map((msg) => (
          <Card key={msg._id} padding="md" className="hover:shadow-sm transition-shadow">
            {/* Top Row: Subject + Status */}
            <div className="flex items-center justify-between gap-4 mb-1">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {msg.subject}
              </h3>
              <Badge variant={statusBadgeVariant[msg.status] || 'muted'}>
                {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
              </Badge>
            </div>

            {/* Body Preview */}
            <p className="text-sm text-muted line-clamp-1 mb-3">
              {msg.body}
            </p>

            {/* Bottom Row: Channel + Recipients | Date */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant={msg.channel === 'email' ? 'info' : 'warning'}>
                  <span className="flex items-center gap-1">
                    {msg.channel === 'email' ? (
                      <Mail className="w-3 h-3" />
                    ) : (
                      <Smartphone className="w-3 h-3" />
                    )}
                    {msg.channel === 'email' ? 'Email' : 'SMS'}
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
    </div>
  );
}
