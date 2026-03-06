'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  ChevronRight,
  Clock,
  MapPin,
  Activity,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Users2,
  Building2,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Card, Button } from '@/components/ui';
import { Badge } from '@/components/dashboard';
import { useAuthStore } from '@/store/authStore';
import { useOrganizationStore } from '@/store/organizationStore';
import { useBranchStore } from '@/store/branchStore';
import { useCurrency } from '@/lib/hooks/useCurrency';
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
  const { formatCurrency } = useCurrency();
  const { selectedBranchId, branches } = useBranchStore();

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.getAll(),
  });

  // Filter members by selected branch
  const filteredMembers = selectedBranchId
    ? members.filter((m: Member) => m.branchId === selectedBranchId)
    : members;

  // Get current branch name for display
  const currentBranchName = selectedBranchId
    ? branches.find(b => b._id === selectedBranchId)?.name || 'Selected Branch'
    : 'All Branches';

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll(),
  });

  const { data: donations = [] } = useQuery({
    queryKey: ['donations'],
    queryFn: donationsApi.getAll,
  });

  const { data: attendanceStats } = useQuery({
    queryKey: ['attendance', 'stats'],
    queryFn: attendanceApi.getStats,
  });

  // Compute current month stats (use filteredMembers for branch-aware stats)
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
  const totalMembers = filteredMembers.length;
  const newMembersThisMonth = filteredMembers.filter((m: Member) => {
    const date = new Date(m.createdAt);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const upcomingEvents = events.filter((e: ChurchEvent) => e.status === 'scheduled').length;
  const ongoingEvents = events.filter((e: ChurchEvent) => e.status === 'ongoing').length;
  
  const monthlyDonations = donations
    .filter((d: Donation) => {
      const date = new Date(d.donationDate);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum: number, d: Donation) => sum + d.amount, 0);

  const lastMonthDonations = donations
    .filter((d: Donation) => {
      const date = new Date(d.donationDate);
      return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
    })
    .reduce((sum: number, d: Donation) => sum + d.amount, 0);

  const donationTrend = lastMonthDonations === 0 ? 0 : 
    ((monthlyDonations - lastMonthDonations) / lastMonthDonations) * 100;

  // Calculate a simple attendance rate: check-ins across all events (placeholder metric)
  const totalCheckIns = attendanceStats?.totalCheckIns ?? 0;

  const stats = [
    {
      label: 'Total Members',
      value: totalMembers.toLocaleString(),
      change: newMembersThisMonth > 0 ? `+${newMembersThisMonth} this month` : 'No change',
      icon: Users,
      trend: newMembersThisMonth > 0 ? 'up' : 'neutral',
      href: '/dashboard/members',
    },
    {
      label: 'Upcoming Events',
      value: upcomingEvents,
      change: ongoingEvents > 0 ? `${ongoingEvents} ongoing` : 'None ongoing',
      icon: Calendar,
      trend: 'neutral',
      href: '/dashboard/events',
    },
    {
      label: 'Branches',
      value: branches.length,
      change: selectedBranchId ? 'Viewing 1 branch' : 'Viewing all',
      icon: Building2,
      trend: 'neutral',
      href: '/dashboard/branches',
    },
    {
      label: 'Total Check-Ins',
      value: totalCheckIns.toLocaleString(),
      change: attendanceStats?.recentCheckIns ? `${attendanceStats.recentCheckIns} last 7 days` : 'No data',
      icon: TrendingUp,
      trend: attendanceStats?.recentCheckIns && attendanceStats?.recentCheckIns > 0 ? 'up' : 'neutral',
      href: '/dashboard/attendance',
    },
  ];

  const quickActions = [
    { label: 'Add New Member', icon: UserPlus, onClick: () => router.push('/dashboard/members/new'), color: 'text-blue-500' },
    { label: 'Create Event', icon: Calendar, onClick: () => router.push('/dashboard/events/new'), color: 'text-green-500' },
    { label: 'Record Donation', icon: DollarSign, onClick: () => router.push('/dashboard/finance/income'), color: 'text-yellow-500' },
    { label: 'Record Attendance', icon: Activity, onClick: () => router.push('/dashboard/attendance'), color: 'text-purple-500' },
  ];

  // Derive recent activity from real data
  const recentActivity = [
    ...members.slice(0, 3).map((m: Member) => ({
      action: 'New member registered',
      name: `${m.firstName} ${m.lastName}`,
      time: m.createdAt,
      icon: UserPlus,
      color: 'text-blue-500',
    })),
    ...donations.slice(0, 3).map((d: Donation) => ({
      action: 'Donation received',
      name: `${formatCurrency(d.amount)} - ${d.donationType || 'General'}`,
      time: d.createdAt,
      icon: DollarSign,
      color: 'text-green-500',
    })),
    ...events.slice(0, 3).map((e: ChurchEvent) => ({
      action: e.status === 'scheduled' ? 'Event scheduled' : 'Event created',
      name: e.title,
      time: e.createdAt,
      icon: Calendar,
      color: 'text-purple-500',
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 6);

  // Get next upcoming events
  const nextEvents = events
    .filter((e: ChurchEvent) => {
      const startDate = new Date(e.startDate);
      return e.status === 'scheduled' && startDate > now;
    })
    .sort((a: ChurchEvent, b: ChurchEvent) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 3);

  // Calculate member demographics
  const getAge = (dateOfBirth: string | undefined): number | null => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Use filteredMembers for branch-aware demographics
  const maleCount = filteredMembers.filter((m: Member) => m.gender === 'male').length;
  const femaleCount = filteredMembers.filter((m: Member) => m.gender === 'female').length;
  const childrenCount = filteredMembers.filter((m: Member) => {
    const age = getAge(m.dateOfBirth);
    return age !== null && age >= 1 && age <= 12;
  }).length;
  const teensCount = filteredMembers.filter((m: Member) => {
    const age = getAge(m.dateOfBirth);
    return age !== null && age >= 13 && age <= 19;
  }).length;
  const adultsCount = filteredMembers.filter((m: Member) => {
    const age = getAge(m.dateOfBirth);
    return age !== null && age >= 20 && age <= 59;
  }).length;
  const seniorsCount = filteredMembers.filter((m: Member) => {
    const age = getAge(m.dateOfBirth);
    return age !== null && age >= 60;
  }).length;

  // Demographics chart data
  const demographicsData = [
    { name: 'Male', value: maleCount, color: '#6366f1' },
    { name: 'Female', value: femaleCount, color: '#ec4899' },
    { name: 'Children', value: childrenCount, color: '#3b82f6' },
    { name: 'Teens', value: teensCount, color: '#22c55e' },
    { name: 'Adults', value: adultsCount, color: '#a855f7' },
    { name: 'Seniors', value: seniorsCount, color: '#f59e0b' },
  ];

  function formatEventDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatEventTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

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
        {stats.map((stat) => {
          const TrendIcon = stat.trend === 'up' ? ArrowUpRight : stat.trend === 'down' ? ArrowDownRight : Minus;
          const trendColor = stat.trend === 'up' ? 'text-green-500' : stat.trend === 'down' ? 'text-red-500' : 'text-muted';
          
          return (
            <Card 
              key={stat.label} 
              padding="md"
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(stat.href)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <TrendIcon className={`w-4 h-4 ${trendColor}`} />
              </div>
              <p className="text-sm text-muted mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-xs text-muted flex items-center gap-1">
                {stat.change}
              </p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card padding="md" className="lg:col-span-1">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Quick Actions
          </h2>
          <div className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-background hover:border-primary/50 transition-all hover:scale-[1.02] group"
                >
                  <div className="w-8 h-8 bg-muted/30 rounded-lg flex items-center justify-center">
                    <Icon className={`w-4 h-4 ${action.color}`} />
                  </div>
                  <span className="text-sm text-foreground flex-1 text-left">{action.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted group-hover:text-foreground transition-colors" />
                </button>
              );
            })}
          </div>
        </Card>

        {/* Member Demographics Chart */}
        <Card padding="md" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Users2 className="w-5 h-5" />
              Member Demographics
            </h2>
            <Badge variant="info">{currentBranchName}</Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demographicsData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                />
                <YAxis 
                  tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--color-card)', 
                    borderColor: 'var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-foreground)'
                  }}
                  labelStyle={{ color: 'var(--color-foreground)', fontWeight: 600 }}
                  cursor={{ fill: 'var(--color-muted)', opacity: 0.1 }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {demographicsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}  
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {demographicsData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                <span className="text-muted">{item.name}:</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Upcoming Events */}
        <Card padding="md" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Events
            </h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/dashboard/events')}
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {nextEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted">
                  No upcoming events scheduled
                </p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => router.push('/dashboard/events/new')}
                  className="mt-4"
                >
                  Create Event
                </Button>
              </div>
            ) : (
              nextEvents.map((event: ChurchEvent) => (
                <div
                  key={event._id}
                  onClick={() => router.push(`/dashboard/events/${event._id}`)}
                  className="flex items-start gap-3 p-3 bg-background rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {event.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatEventDate(event.startDate)} • {formatEventTime(event.startDate)}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  {event.eventType && (
                    <Badge variant="muted">
                      {event.eventType}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Branches */}
        <Card padding="md" className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Branches
            </h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/dashboard/branches')}
            >
              Manage
            </Button>
          </div>
          <div className="space-y-3">
            {branches.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 text-muted mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted">
                  No branches created yet
                </p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => router.push('/dashboard/branches/new')}
                  className="mt-4"
                >
                  Add Branch
                </Button>
              </div>
            ) : (
              branches.slice(0, 5).map((branch) => (
                <div
                  key={branch._id}
                  onClick={() => router.push(`/dashboard/branches/${branch._id}`)}
                  className="flex items-center gap-3 p-3 bg-background rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {branch.name}
                    </p>
                    {branch.address && (
                      <p className="text-xs text-muted truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {branch.address}
                      </p>
                    )}
                  </div>
                  {selectedBranchId === branch._id && (
                    <Badge variant="success">Active</Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card padding="md" className="mt-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recent Activity
        </h2>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">
              No recent activity yet. Start by adding members or creating events.
            </p>
          ) : (
            recentActivity.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={index} className="flex items-center gap-3 p-3 bg-background rounded-lg">
                  <div className="w-8 h-8 bg-muted/30 rounded-lg flex items-center justify-center">
                    <Icon className={`w-4 h-4 ${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted">{activity.action}</p>
                    <p className="text-sm font-medium text-foreground truncate">{activity.name}</p>
                  </div>
                  <span className="text-xs text-muted whitespace-nowrap">{getTimeAgo(activity.time)}</span>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
