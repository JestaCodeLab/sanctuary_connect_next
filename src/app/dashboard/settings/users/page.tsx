'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Users, Building2, Shield, Check } from 'lucide-react';

import { PageHeader, Badge, Modal } from '@/components/dashboard';
import { Button, Card } from '@/components/ui';
import { userBranchApi, organizationApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { UserWithBranches, Branch } from '@/types';

const roleBadgeVariant: Record<string, 'info' | 'success' | 'warning' | 'muted'> = {
  admin: 'info',
  pastor: 'success',
  staff: 'warning',
  member: 'muted',
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [editTarget, setEditTarget] = useState<UserWithBranches | null>(null);
  const [selectedBranchIds, setSelectedBranchIds] = useState<Set<string>>(new Set());

  const { data: orgData } = useQuery({
    queryKey: ['organization'],
    queryFn: () => organizationApi.getMyOrganization(),
  });

  const orgId = orgData?.organization?._id;
  const allBranches: Branch[] = orgData?.branches ?? [];

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['org-users', orgId],
    queryFn: () => userBranchApi.getOrgUsers(orgId!),
    enabled: !!orgId,
  });

  const assignMutation = useMutation({
    mutationFn: ({ userId, branchIds }: { userId: string; branchIds: string[] }) =>
      userBranchApi.assignBranches(orgId!, userId, branchIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-users'] });
      toast.success('Branch assignments updated');
      setEditTarget(null);
    },
    onError: () => {
      toast.error('Failed to update branch assignments');
    },
  });

  const handleOpenEdit = (u: UserWithBranches) => {
    setEditTarget(u);
    setSelectedBranchIds(new Set(u.branches.map(b => b._id)));
  };

  const handleToggleBranch = (branchId: string) => {
    setSelectedBranchIds(prev => {
      const next = new Set(prev);
      if (next.has(branchId)) {
        next.delete(branchId);
      } else {
        next.add(branchId);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!editTarget) return;
    assignMutation.mutate({
      userId: editTarget._id,
      branchIds: Array.from(selectedBranchIds),
    });
  };

  // Only admin can access
  if (user?.role !== 'admin') {
    return (
      <div>
        <PageHeader title="Users & Branches" description="Manage user branch assignments" />
        <Card padding="lg">
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-foreground font-medium">Admin access required</p>
            <p className="text-sm text-muted mt-1">Only administrators can manage user assignments.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Users & Branches"
        description="Manage which branches each user can access"
      />

      <Card padding="none">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Organization Users</h2>
          <p className="text-sm text-muted mt-1">Assign users to branches to control their data access</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-foreground font-medium">No users found</p>
            <p className="text-sm text-muted mt-1">Users will appear here once they register and join your organization.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">User</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Branches</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u: UserWithBranches) => (
                  <tr key={u._id} className="hover:bg-background transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={roleBadgeVariant[u.role] || 'muted'}>
                        {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {u.role === 'admin' ? (
                        <span className="text-xs text-muted italic">All branches (admin)</span>
                      ) : u.branches.length === 0 ? (
                        <span className="text-xs text-muted italic">No branches assigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.branches.map((b: Branch) => (
                            <span
                              key={b._id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-light text-primary"
                            >
                              <Building2 className="w-3 h-3" />
                              {b.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.role !== 'admin' && (
                        <Button variant="outline" size="sm" onClick={() => handleOpenEdit(u)}>
                          Edit Branches
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Branches Modal */}
      <Modal
        isOpen={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title="Edit Branch Assignments"
        description={editTarget ? `Assign branches for ${editTarget.firstName} ${editTarget.lastName}` : ''}
        size="md"
      >
        {editTarget && (
          <div>
            <div className="space-y-2 mb-6">
              {allBranches.map((branch) => {
                const isSelected = selectedBranchIds.has(branch._id);
                return (
                  <button
                    key={branch._id}
                    type="button"
                    onClick={() => handleToggleBranch(branch._id)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border transition-colors text-left ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-background'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-primary border-primary' : 'border-border'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{branch.name}</p>
                      {branch.isHeadOffice && (
                        <p className="text-xs text-muted">Head Office</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setEditTarget(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                isLoading={assignMutation.isPending}
              >
                Save Assignments
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
