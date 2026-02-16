'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { membersApi, eventsApi, donationsApi, attendanceApi } from '@/lib/api';
import type { Member, ChurchEvent, Donation } from '@/types';

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.getAll,
  });

  const { data: donations = [] } = useQuery({
    queryKey: ['donations'],
    queryFn: donationsApi.getAll,
  });

  const { data: attendanceStats } = useQuery({
    queryKey: ['attendance', 'stats'],
    queryFn: attendanceApi.getStats,
  });

  // Compute stats
  const totalMembers = members.length;
  const upcomingEvents = events.filter((e: ChurchEvent) => e.status === 'scheduled').length;
  const now = new Date();
  const monthlyDonations = donations
    .filter((d: Donation) => {
      const date = new Date(d.donationDate);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum: number, d: Donation) => sum + d.amount, 0);
  const attendanceRate = attendanceStats?.averageRate ?? 0;

  const stats = [
    {
      label: 'Total Members',
      value: totalMembers.toLocaleString(),
      icon: Users,
    },
    {
      label: 'Upcoming Events',
      value: upcomingEvents,
      icon: Calendar,
    },
    {
      label: 'Donations (MTD)',
      value: `GHS ${monthlyDonations.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
    },
    {
      label: 'Attendance Rate',
      value: `${attendanceRate}%`,
      icon: TrendingUp,
    },
  ];

  const quickActions = [
    { label: 'Add New Member', onClick: () => router.push('/dashboard/members/new') },
    { label: 'Create Event', onClick: () => router.push('/dashboard/events') },
    { label: 'Record Donation', onClick: () => router.push('/dashboard/finance') },
    { label: 'Send Announcement', onClick: () => router.push('/dashboard/communication') },
  ];

  // Derive recent activity from real data
  const recentActivity = [
    ...members.slice(0, 3).map((m: Member) => ({
      action: 'New member registered',
      name: `${m.firstName} ${m.lastName}`,
      time: m.createdAt,
    })),
    ...donations.slice(0, 3).map((d: Donation) => ({
      action: 'Donation received',
      name: `GHS ${d.amount} - ${d.donationType || 'General'}`,
      time: d.createdAt,
    })),
    ...events.slice(0, 3).map((e: ChurchEvent) => ({
      action: 'Event created',
      name: e.title,
      time: e.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5);

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-muted mt-1">
          Here&apos;s what&apos;s happening with your church today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
              </div>
              <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card padding="md" className="lg:col-span-1">
          <h2 className="font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-background transition-colors"
              >
                <span className="text-sm text-foreground">{action.label}</span>
                <ChevronRight className="w-4 h-4 text-muted" />
              </button>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card padding="md" className="lg:col-span-2">
          <h2 className="font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">
                No recent activity yet. Start by adding members or creating events.
              </p>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-background rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{activity.action}</p>
                    <p className="text-xs text-muted">{activity.name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{getTimeAgo(activity.time)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
