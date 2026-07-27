'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Users, UserPlus, X, Mail, Phone, MessageSquare, CalendarPlus, Calendar, Sparkles } from 'lucide-react';
import { departmentsApi, eventsApi } from '@/lib/api';
import { Card, Button } from '@/components/ui';
import { Badge, PageLoader } from '@/components/dashboard';
import MemberSearch from '@/components/dashboard/MemberSearch';
import FeatureGate from '@/components/dashboard/FeatureGate';
import SendSmsDialog from '@/components/dashboard/SendSmsDialog';
import type { Member } from '@/types';

function healthScoreColorClasses(score: number | null): string {
  if (score === null) return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
  if (score >= 70) return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
  if (score >= 40) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
}

interface SmsDialogConfig {
  open: boolean;
  departmentId?: string;
  memberIds?: string[];
  initialMessage?: string;
}

function DepartmentDetailContent({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [smsDialogConfig, setSmsDialogConfig] = useState<SmsDialogConfig>({ open: false });

  const { data: department, isLoading } = useQuery({
    queryKey: ['departments', id],
    queryFn: () => departmentsApi.getById(id),
  });

  const { data: departmentEvents = [] } = useQuery({
    queryKey: ['events', 'department', id],
    queryFn: () => eventsApi.getAll({ departmentId: id }),
  });

  const { data: insights } = useQuery({
    queryKey: ['departments', id, 'insights'],
    queryFn: () => departmentsApi.getInsights(id),
  });

  const upcomingEvents = departmentEvents
    .filter((e) => (e.status === 'scheduled' || e.status === 'ongoing') && new Date(e.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const addMemberMutation = useMutation({
    mutationFn: (memberId: string) => departmentsApi.addMember(id, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', id] });
      toast.success('Member added');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to add member';
      console.error('Add member error:', error);
      toast.error(message);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => departmentsApi.removeMember(id, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', id] });
      toast.success('Member removed');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to remove member';
      console.error('Remove member error:', error);
      toast.error(message);
    },
  });

  if (isLoading) {
    return <PageLoader label="Loading department..." />;
  }

  if (!department) {
    return (
      <Card className="text-center py-12">
        <p className="text-gray-500">Department not found</p>
        <Link href="/dashboard/departments" className="text-primary hover:underline mt-2 inline-block text-sm">
          Back to Departments
        </Link>
      </Card>
    );
  }

  const memberIds = (department.members || []).map((m: Member) => m._id);

  // Calculate member stats by status
  const members = department.members || [];
  const activeCount = members.filter((m: Member) => m.memberStatus === 'active').length;
  const inactiveCount = members.filter((m: Member) => m.memberStatus === 'inactive').length;
  const visitingCount = members.filter((m: Member) => m.memberStatus === 'visiting').length;
  const transferredCount = members.filter((m: Member) => m.memberStatus === 'transferred').length;

  const statusColors: Record<string, 'success' | 'error' | 'info' | 'warning'> = {
    active: 'success',
    inactive: 'error',
    visiting: 'info',
    transferred: 'warning',
  };

  return (
    <div className="w-full">
      <Link
        href="/dashboard/departments"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Departments
      </Link>

      {/* Header */}
      <Card className="mb-6 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{department.name}</h1>
              {(insights?.attendance.occurrencesConsidered ?? 0) > 0 && (
                <Badge variant="success">Active This Week</Badge>
              )}
            </div>
            {(department.tags || []).length > 0 && (
              <p className="text-sm text-primary font-medium mt-1">{(department.tags || []).join(' • ')}</p>
            )}
            {department.description && (
              <p className="text-gray-500 dark:text-gray-400 mt-1">{department.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
              <span>Branch: {typeof department.branchId === 'object' ? department.branchId.name : 'Unknown'}</span>
              <span>
                Leader: {department.leaderId ? `${department.leaderId.firstName} ${department.leaderId.lastName}` : 'Unassigned'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">{department.members?.length || 0} members</span>
            </div>
            <div className={`px-3 py-1.5 rounded-lg ${healthScoreColorClasses(insights?.healthScore ?? null)}`}>
              <span className="text-sm font-semibold">
                {insights?.healthScore != null ? `${insights.healthScore}% Health` : 'No score yet'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
          <Button size="sm" leftIcon={<MessageSquare className="w-4 h-4" />} onClick={() => setSmsDialogConfig({ open: true, departmentId: id })}>
            Message All
          </Button>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => document.getElementById('add-member-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Add Member
          </Button>
          <Link href={`/dashboard/events/new?departmentId=${id}`}>
            <Button size="sm" variant="outline" leftIcon={<CalendarPlus className="w-4 h-4" />}>
              Schedule Meeting
            </Button>
          </Link>
        </div>
      </Card>

      {/* AI Ministry Assistant */}
      {insights?.digest && (
        <Card className="mb-6 p-6 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Ministry Assistant</h2>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{insights.digest.greeting}</p>
          {insights.digest.sentences.length > 0 && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
              This week: {insights.digest.sentences.join(' ')}
            </p>
          )}
          {insights.digest.followUp && (
            <button
              onClick={() => {
                const memberIds = [
                  ...new Set([
                    ...insights.absences.map((a) => a.memberId),
                    ...insights.upcomingBirthdays.map((b) => b.memberId),
                  ]),
                ];
                setSmsDialogConfig({ open: true, memberIds });
              }}
              className="text-sm text-primary font-medium hover:underline mt-3 block"
            >
              {insights.digest.followUp}
            </button>
          )}

          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-primary/20">
            {insights.digest.suggestions.map((suggestion) =>
              suggestion.action === 'link' ? (
                <Link key={suggestion.label} href={suggestion.href!}>
                  <span className="inline-block text-xs font-medium px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-primary/30 text-primary hover:bg-primary/10 transition-colors cursor-pointer">
                    {suggestion.label}
                  </span>
                </Link>
              ) : (
                <button
                  key={suggestion.label}
                  onClick={() => setSmsDialogConfig({ open: true, departmentId: id, initialMessage: suggestion.initialMessage })}
                  className="text-xs font-medium px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                >
                  {suggestion.label}
                </button>
              )
            )}
          </div>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Members</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{members.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{activeCount}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Visiting</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{visitingCount}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Inactive</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{inactiveCount}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming Meetings/Events */}
      <Card className="mb-6 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Upcoming Events {upcomingEvents.length > 0 && `(${upcomingEvents.length})`}
            </h2>
          </div>
          <Link href={`/dashboard/events/new?departmentId=${id}`} className="text-sm text-primary hover:underline">
            Schedule one
          </Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming events scheduled for this department.</p>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.slice(0, 3).map((event) => (
              <Link
                key={event._id}
                href={`/dashboard/events/${event._id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-primary/50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{event.title}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Add Member */}
      <Card id="add-member-section" className="mb-6 p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Member</h2>
        </div>
        <MemberSearch
          onSelect={(member) => addMemberMutation.mutate(member._id)}
          excludeIds={memberIds}
          placeholder="Search members to add..."
        />
      </Card>

      {/* Members List */}
      <Card padding="none">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Members</h2>
        </div>

        {!department.members || department.members.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No members in this department yet</p>
          </div>
        ) : (
          <div>
            {department.members.map((member: Member) => (
              <div
                key={member._id}
                className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-gray-700/50 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary text-sm font-medium">
                    {member.firstName[0]}{member.lastName[0]}
                  </div>
                  <div>
                    <Link
                      href={`/dashboard/members/${member._id}`}
                      className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-primary"
                    >
                      {member.firstName} {member.lastName}
                    </Link>
                    <div className="flex items-center gap-3 mt-0.5">
                      {member.email && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Mail className="w-3 h-3" />
                          {member.email}
                        </span>
                      )}
                      {member.phone && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="w-3 h-3" />
                          {member.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusColors[member.memberStatus] || 'muted'}>
                    {member.memberStatus}
                  </Badge>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${member.firstName} ${member.lastName} from this department?`)) {
                        removeMemberMutation.mutate(member._id);
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                    title="Remove from department"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <SendSmsDialog
        open={smsDialogConfig.open}
        onOpenChange={(open) => setSmsDialogConfig((c) => ({ ...c, open }))}
        initialDepartmentId={smsDialogConfig.departmentId}
        preselectedMemberIds={smsDialogConfig.memberIds}
        lockSendType={!!smsDialogConfig.departmentId || !!smsDialogConfig.memberIds}
        initialMessage={smsDialogConfig.initialMessage}
      />
    </div>
  );
}

export default function DepartmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <FeatureGate featureKey="department_management" featureName="Department Management">
      <DepartmentDetailContent id={id} />
    </FeatureGate>
  );
}
