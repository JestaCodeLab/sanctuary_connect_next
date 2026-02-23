'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Users, UserPlus, Search, Trash2, Edit2, Eye } from 'lucide-react';
import { PageHeader, StatsGrid, Badge, EmptyState, Modal } from '@/components/dashboard';
import { Button, Input, Card } from '@/components/ui';
import { membersApi } from '@/lib/api';
import type { Member } from '@/types';

const statusBadgeVariant: Record<string, 'success' | 'error' | 'info' | 'warning' | 'muted'> = {
  active: 'success',
  inactive: 'error',
  visiting: 'info',
  transferred: 'warning',
};

const statusFilters = ['All', 'Active', 'Inactive', 'Visiting'] as const;

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

export default function MembersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: membersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Member removed');
      setDeleteId(null);
    },
  });

  // Client-side search and filter
  const filteredMembers = members.filter((member: Member) => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'All' || member.memberStatus === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Compute stats
  const totalMembers = members.length;
  const activeCount = members.filter((m: Member) => m.memberStatus === 'active').length;
  const inactiveCount = members.filter((m: Member) => m.memberStatus === 'inactive').length;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const newThisMonth = members.filter(
    (m: Member) => new Date(m.createdAt) >= startOfMonth
  ).length;

  const stats = [
    { label: 'Total Members', value: totalMembers, icon: Users },
    { label: 'Active', value: activeCount, icon: Users },
    { label: 'Inactive', value: inactiveCount, icon: Users },
    { label: 'New This Month', value: newThisMonth, icon: UserPlus },
  ];

  const memberToDelete = deleteId
    ? members.find((m: Member) => m._id === deleteId)
    : null;

  return (
    <div>
      <PageHeader
        title="Member Directory"
        description="Manage your church members"
        actionLabel="Add Member"
        actionIcon={UserPlus}
        onAction={() => router.push('/dashboard/members/new')}
      />

      <StatsGrid stats={stats} />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
          {statusFilters.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-foreground hover:bg-card'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Members Table */}
      {isLoading ? (
        <Card padding="lg">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </Card>
      ) : filteredMembers.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={Users}
            title="No members found"
            description={
              search || statusFilter !== 'All'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first church member.'
            }
            actionLabel={!search && statusFilter === 'All' ? 'Add Member' : undefined}
            onAction={
              !search && statusFilter === 'All'
                ? () => router.push('/dashboard/members/new')
                : undefined
            }
          />
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">
                    Phone
                  </th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">
                    Joined Date
                  </th>
                  <th className="text-right text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMembers.map((member: Member) => (
                  <tr
                    key={member._id}
                    className="hover:bg-background transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-white">
                            {getInitials(
                              member.firstName,
                              member.lastName
                            )}
                          </span>
                        </div>
                        <div>
                          <Link
                            href={`/dashboard/members/${member._id}`}
                            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {member.firstName} {member.lastName}
                          </Link>
                          <p className="text-xs text-muted">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-foreground">
                        {member.phone || '\u2014'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          statusBadgeVariant[member.memberStatus] || 'muted'
                        }
                      >
                        {member.memberStatus.charAt(0).toUpperCase() +
                          member.memberStatus.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-foreground">
                        {member.membershipDate
                          ? formatDate(member.membershipDate)
                          : formatDate(member.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/members/${member._id}`)}
                          aria-label={`View ${member.firstName} ${member.lastName}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/members/${member._id}/edit`)}
                          aria-label={`Edit ${member.firstName} ${member.lastName}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(member._id)}
                          aria-label={`Delete ${member.firstName} ${member.lastName}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Remove Member"
        description="This action cannot be undone."
        size="sm"
      >
        <div>
          <p className="text-sm text-muted mb-6">
            Are you sure you want to remove{' '}
            <span className="font-semibold text-foreground">
              {memberToDelete
                ? `${memberToDelete.firstName} ${memberToDelete.lastName}`
                : 'this member'}
            </span>{' '}
            from the directory?
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
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
