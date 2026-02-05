'use client';

import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';

const stats = [
  {
    label: 'Total Members',
    value: '1,234',
    change: '+12%',
    changeType: 'positive',
    icon: Users,
  },
  {
    label: 'Events This Month',
    value: '8',
    change: '+3',
    changeType: 'positive',
    icon: Calendar,
  },
  {
    label: 'Donations (MTD)',
    value: '$24,500',
    change: '+18%',
    changeType: 'positive',
    icon: DollarSign,
  },
  {
    label: 'Attendance Rate',
    value: '78%',
    change: '-2%',
    changeType: 'negative',
    icon: TrendingUp,
  },
];

const quickActions = [
  { label: 'Add New Member', href: '#' },
  { label: 'Create Event', href: '#' },
  { label: 'Record Donation', href: '#' },
  { label: 'Send Announcement', href: '#' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();

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
                <p className={`text-sm mt-1 ${
                  stat.changeType === 'positive' ? 'text-success' : 'text-error'
                }`}>
                  {stat.change} from last month
                </p>
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
            {[
              { action: 'New member registered', name: 'John Smith', time: '2 minutes ago' },
              { action: 'Donation received', name: '$250 - Building Fund', time: '1 hour ago' },
              { action: 'Event created', name: 'Sunday Service', time: '3 hours ago' },
              { action: 'Member updated', name: 'Jane Doe', time: 'Yesterday' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-background rounded-lg">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{activity.action}</p>
                  <p className="text-xs text-muted">{activity.name}</p>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Coming Soon Banner */}
      <Card padding="lg" className="mt-8 bg-gradient-to-r from-primary to-primary-hover text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Full Dashboard Coming Soon</h3>
            <p className="text-white/80 mt-1">
              We&apos;re building out the complete church management experience. Stay tuned!
            </p>
          </div>
          <button className="px-4 py-2 bg-white text-primary rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
            Learn More
          </button>
        </div>
      </Card>
    </div>
  );
}
