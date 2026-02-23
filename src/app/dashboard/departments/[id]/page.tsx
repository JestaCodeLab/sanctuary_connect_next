'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Users, UserPlus, X, Mail, Phone } from 'lucide-react';
import { departmentsApi } from '@/lib/api';
import { Card, Button } from '@/components/ui';
import { Badge } from '@/components/dashboard';
import MemberSearch from '@/components/dashboard/MemberSearch';
import FeatureGate from '@/components/dashboard/FeatureGate';
import type { Member } from '@/types';

function DepartmentDetailContent({ id }: { id: string }) {
  const queryClient = useQueryClient();

  const { data: department, isLoading } = useQuery({
    queryKey: ['departments', id],
    queryFn: () => departmentsApi.getById(id),
  });

  const addMemberMutation = useMutation({
    mutationFn: (memberId: string) => departmentsApi.addMember(id, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', id] });
      toast.success('Member added');
    },
    onError: () => toast.error('Failed to add member'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => departmentsApi.removeMember(id, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', id] });
      toast.success('Member removed');
    },
    onError: () => toast.error('Failed to remove member'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{department.name}</h1>
            {department.description && (
              <p className="text-gray-500 dark:text-gray-400 mt-1">{department.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
              <span>Branch: {typeof department.branchId === 'object' ? department.branchId.name : 'Unknown'}</span>
              {department.leaderId && (
                <span>
                  Leader: {department.leaderId.firstName} {department.leaderId.lastName}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{department.members?.length || 0} members</span>
          </div>
        </div>
      </Card>

      {/* Add Member */}
      <Card className="mb-6 p-6">
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
