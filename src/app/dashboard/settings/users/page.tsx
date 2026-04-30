'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Users, Building2, Shield, Check, Mail, Clock, X, UserPlus } from 'lucide-react';

import { PageHeader, Badge, Modal } from '@/components/dashboard';
import { Button, Card, Input } from '@/components/ui';
import { userBranchApi, organizationApi, invitationApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { UserWithBranches, Branch, Invitation } from '@/types';

const roleBadgeVariant: Record<string, 'info' | 'success' | 'warning' | 'muted'> = {
  admin: 'info',
  pastor: 'success',
  staff: 'warning',
  member: 'muted',
};


export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Branch assignment state
  const [editTarget, setEditTarget] = useState<UserWithBranches | null>(null);
  const [selectedBranchIds, setSelectedBranchIds] = useState<Set<string>>(new Set());

  // Invite state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const { data: orgData } = useQuery({
    queryKey: ['organization'],
    queryFn: () => organizationApi.getMyOrganization(),
  });

  const orgId = orgData?.organization?._id;
  const allBranches: Branch[] = orgData?.branches ?? [];

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['org-users', orgId],
    queryFn: () => userBranchApi.getOrgUsers(orgId!),
    enabled: !!orgId,
  });

  const { data: invitationsData, isLoading: invitationsLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => invitationApi.list(),
  });

  const pendingInvitations = (invitationsData?.invitations ?? []).filter(
    (inv: Invitation) => inv.status === 'pending'
  );

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

  const inviteMutation = useMutation({
    mutationFn: (email: string) => invitationApi.send(email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation sent');
      setInviteModalOpen(false);
      setInviteEmail('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to send invitation');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => invitationApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation revoked');
    },
    onError: () => {
      toast.error('Failed to revoke invitation');
    },
  });

  const handleOpenEdit = (u: UserWithBranches) => {
    setEditTarget(u);
    setSelectedBranchIds(new Set(u.branches.map(b => b._id)));
  };

  const handleToggleBranch = (branchId: string) => {
    setSelectedBranchIds(prev => {
      const next = new Set(prev);
      if (next.has(branchId)) next.delete(branchId);
      else next.add(branchId);
      return next;
    });
  };

  const handleSave = () => {
    if (!editTarget) return;
    assignMutation.mutate({ userId: editTarget._id, branchIds: Array.from(selectedBranchIds) });
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    inviteMutation.mutate(email);
  };

  if (user?.role !== 'admin') {
    return (
      <div>
        <PageHeader title="Team & Users" description="Manage team members and branch assignments" />
        <Card padding="lg">
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-foreground font-medium">Admin access required</p>
            <p className="text-sm text-muted mt-1">Only administrators can manage users.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team & Users"
        description="Invite admins and manage branch access for your team"
        actionLabel="Invite Admin"
        actionIcon={UserPlus}
        onAction={() => setInviteModalOpen(true)}
      />

      {/* Pending Invitations */}
      {(invitationsLoading || pendingInvitations.length > 0) && (
        <Card padding="none">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Pending Invitations</h2>
            <p className="text-sm text-muted mt-1">Invitations awaiting acceptance</p>
          </div>

          {invitationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pendingInvitations.map((inv: Invitation) => (
                <div key={inv._id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{inv.email}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 text-muted" />
                        <p className="text-xs text-muted">
                          Sent {new Date(inv.createdAt).toLocaleDateString()} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                          {inv.invitedBy && ` · by ${inv.invitedBy.firstName} ${inv.invitedBy.lastName}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => revokeMutation.mutate(inv._id)}
                    disabled={revokeMutation.isPending}
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Organization Users */}
      <Card padding="none">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Organization Users</h2>
          <p className="text-sm text-muted mt-1">Assign users to branches to control their data access</p>
        </div>

        {usersLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-foreground font-medium">No users found</p>
            <p className="text-sm text-muted mt-1">Invite an admin above to get started.</p>
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

      {/* Invite Admin Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => { setInviteModalOpen(false); setInviteEmail(''); }}
        title="Invite Admin"
        description="They'll receive an email to set up their account with admin access."
        size="sm"
      >
        <form onSubmit={handleSendInvite}>
          <div className="mb-5">
            <label className="block text-sm font-medium text-foreground mb-1">Email address</label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="admin@example.com"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => { setInviteModalOpen(false); setInviteEmail(''); }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={inviteMutation.isPending} disabled={!inviteEmail.trim()}>
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>

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
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-background'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-primary border-primary' : 'border-border'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{branch.name}</p>
                      {branch.isHeadOffice && <p className="text-xs text-muted">Head Office</p>}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button onClick={handleSave} isLoading={assignMutation.isPending}>Save Assignments</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
