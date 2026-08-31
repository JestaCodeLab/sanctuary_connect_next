'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Users, Building2, Shield, Check, Mail, Clock, X, UserPlus, Tag } from 'lucide-react';

import { PageHeader, Badge, Modal } from '@/components/dashboard';
import RoleFormModal from '@/components/dashboard/RoleFormModal';
import { Button, Card, Input } from '@/components/ui';
import { userBranchApi, organizationApi, invitationApi, departmentsApi, roleApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { UserWithBranches, Branch, Department, Invitation, Role } from '@/types';

// 'staff'/'member' retired as assignable roles - custom roles now cover that
// need. Existing users who already hold those roles keep them (and still
// render correctly via roleBadgeVariant/RoleDisplayName below); they're just
// no longer offered here for new invites or reassignment.
const BUILT_IN_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'pastor', label: 'Pastor' },
];

const roleBadgeVariant: Record<string, 'info' | 'success' | 'warning' | 'muted'> = {
  admin: 'info',
  pastor: 'success',
  staff: 'warning',
  member: 'muted',
  custom: 'muted',
};

// Which built-in roles are scoped by branch assignment (everyone except admin,
// who implicitly sees all branches). Custom roles are always scoped.
const isScopedRole = (role: string) => role !== 'admin';

// Single <select> covers both built-in and custom roles: a built-in option's
// value is the role itself ('admin'/'pastor'); anything else is a custom
// role's _id, so falling through to the else branch is what actually wires
// up customRoleId - previously a second, separate "or pick a custom role"
// select was the only thing that did this correctly.
const selectRole = (
  value: string,
  setRole: (role: string) => void,
  setCustomRoleId: (id: string) => void
) => {
  if (BUILT_IN_ROLES.some(r => r.value === value)) {
    setRole(value);
    setCustomRoleId('');
  } else {
    setRole('custom');
    setCustomRoleId(value);
  }
};

// Resolve the branch(es) a non-admin invite/edit should actually get: on a
// single-branch plan there's nothing to choose, so silently assign the org's
// one branch instead of showing a picker with one inevitable checkbox.
const resolveBranchIds = (role: string, allBranches: Branch[], selected: Set<string>): string[] => {
  if (!isScopedRole(role)) return [];
  if (allBranches.length <= 1) return allBranches.map(b => b._id);
  return Array.from(selected);
};

// Departments belong to a branch, so which ones are even choosable depends
// on which branch(es) are selected above - single-branch orgs have an
// implicit answer, multi-branch orgs need an explicit pick first.
const departmentsForBranches = (allBranches: Branch[], allDepartments: Department[], branchIds: Set<string>): Department[] => {
  const scopedBranchIds = allBranches.length <= 1 ? allBranches.map(b => b._id) : Array.from(branchIds);
  return allDepartments.filter(d => scopedBranchIds.includes(d.branchId._id));
};

function RoleDisplayName(u: UserWithBranches) {
  if (u.role === 'custom') return u.customRole?.name || 'Custom role';
  return u.role.charAt(0).toUpperCase() + u.role.slice(1);
}

export default function UsersBranchesTab() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Combined role+scope edit state (replaces the old branches-only editor)
  const [editTarget, setEditTarget] = useState<UserWithBranches | null>(null);
  const [editRole, setEditRole] = useState('admin');
  const [editCustomRoleId, setEditCustomRoleId] = useState('');
  const [editBranchIds, setEditBranchIds] = useState<Set<string>>(new Set());
  const [editDepartmentIds, setEditDepartmentIds] = useState<Set<string>>(new Set());

  // Invite state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('admin');
  const [inviteCustomRoleId, setInviteCustomRoleId] = useState('');
  const [inviteBranchIds, setInviteBranchIds] = useState<Set<string>>(new Set());
  const [inviteDepartmentIds, setInviteDepartmentIds] = useState<Set<string>>(new Set());

  // Lets an admin create their first custom role without leaving the invite
  // flow - opens on top of the invite modal, then hands the new role straight
  // back into it.
  const [createRoleOpen, setCreateRoleOpen] = useState(false);

  const { data: orgData } = useQuery({
    queryKey: ['organization'],
    queryFn: () => organizationApi.getMyOrganization(),
  });

  const orgId = orgData?.organization?._id;
  const allBranches: Branch[] = orgData?.branches ?? [];

  // allBranches: true - this list needs to cover every branch so it can be
  // filtered down to whichever branch(es) get picked for the invitee/user
  // below, independent of whatever branch the admin is currently viewing.
  const { data: allDepartments = [] } = useQuery({
    queryKey: ['departments', 'all-branches'],
    queryFn: () => departmentsApi.getAll({ allBranches: true }),
  });

  const { data: customRolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleApi.list(),
  });
  const customRoles: Role[] = (customRolesData?.roles ?? []).filter(r => r.isActive);

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

  // Drop any picked department that doesn't belong to the currently-selected
  // branch(es) - relevant if the admin checked a department, then changed
  // which branch(es) they're assigning before submitting.
  const resolveDepartmentIds = (role: string, branchIds: Set<string>, deptIds: Set<string>): string[] => {
    if (role !== 'custom') return [];
    const validIds = new Set(departmentsForBranches(allBranches, allDepartments, branchIds).map(d => d._id));
    return Array.from(deptIds).filter(id => validIds.has(id));
  };

  const inviteMutation = useMutation({
    mutationFn: () =>
      invitationApi.send({
        email: inviteEmail.trim(),
        role: inviteRole,
        customRoleId: inviteRole === 'custom' ? inviteCustomRoleId : undefined,
        branchIds: isScopedRole(inviteRole) ? resolveBranchIds(inviteRole, allBranches, inviteBranchIds) : undefined,
        departmentIds: resolveDepartmentIds(inviteRole, inviteBranchIds, inviteDepartmentIds),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation sent');
      setInviteModalOpen(false);
      resetInviteForm();
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

  const updateRoleMutation = useMutation({
    mutationFn: () =>
      userBranchApi.updateUserRole(orgId!, editTarget!._id, {
        role: editRole,
        customRoleId: editRole === 'custom' ? editCustomRoleId : undefined,
        branchIds: resolveBranchIds(editRole, allBranches, editBranchIds),
        departmentIds: resolveDepartmentIds(editRole, editBranchIds, editDepartmentIds),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-users'] });
      toast.success('Role updated');
      setEditTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to update role');
    },
  });

  const resetInviteForm = () => {
    setInviteEmail('');
    setInviteRole('admin');
    setInviteCustomRoleId('');
    setInviteBranchIds(new Set());
    setInviteDepartmentIds(new Set());
  };

  const handleOpenEdit = (u: UserWithBranches) => {
    setEditTarget(u);
    setEditRole(u.role);
    setEditCustomRoleId(u.customRole?._id || '');
    setEditBranchIds(new Set(u.branches.map(b => b._id)));
    setEditDepartmentIds(new Set((u.departments ?? []).map(d => d._id)));
  };

  const toggleSet = (setter: (fn: (prev: Set<string>) => Set<string>) => void, id: string) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    if (inviteRole === 'custom' && !inviteCustomRoleId) {
      toast.error('Select a custom role');
      return;
    }
    inviteMutation.mutate();
  };

  const handleSaveRole = () => {
    if (!editTarget) return;
    if (editRole === 'custom' && !editCustomRoleId) {
      toast.error('Select a custom role');
      return;
    }
    updateRoleMutation.mutate();
  };

  if (user?.role !== 'admin') {
    return (
      <Card padding="lg">
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-foreground font-medium">Admin access required</p>
          <p className="text-sm text-muted mt-1">Only administrators can manage users.</p>
        </div>
      </Card>
    );
  }

  const renderScopePickers = (
    role: string,
    branchIds: Set<string>,
    onToggleBranch: (id: string) => void,
    departmentIds: Set<string>,
    onToggleDepartment: (id: string) => void
  ) => (
    <>
      {isScopedRole(role) && allBranches.length > 1 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">Branch access</label>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {allBranches.map((branch) => {
              const isSelected = branchIds.has(branch._id);
              return (
                <button
                  key={branch._id}
                  type="button"
                  onClick={() => onToggleBranch(branch._id)}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg border transition-colors text-left ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-background'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-primary border-primary' : 'border-border'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-foreground">{branch.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {role === 'custom' && allBranches.length > 1 && branchIds.size === 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">Department access</label>
          <p className="text-xs text-muted italic">Select a branch above to see its departments</p>
        </div>
      )}

      {role === 'custom' && (allBranches.length <= 1 || branchIds.size > 0) && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">Department access</label>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {(() => {
              const scopedDepartments = departmentsForBranches(allBranches, allDepartments, branchIds);
              if (scopedDepartments.length === 0) {
                return <p className="text-xs text-muted italic">No departments in the selected branch{branchIds.size > 1 ? 'es' : ''} yet</p>;
              }
              return scopedDepartments.map((dept: Department) => {
                const isSelected = departmentIds.has(dept._id);
                return (
                  <button
                    key={dept._id}
                    type="button"
                    onClick={() => onToggleDepartment(dept._id)}
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg border transition-colors text-left ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-background'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-primary border-primary' : 'border-border'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm text-foreground">{dept.name}</span>
                  </button>
                );
              });
            })()}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team & Users"
        description="Invite team members and control what they can access"
        actionLabel="Invite Team Member"
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
                          {inv.role} · Sent {new Date(inv.createdAt).toLocaleDateString()} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
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
          <p className="text-sm text-muted mt-1">Manage roles and branch/department access for your team</p>
        </div>

        {usersLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-foreground font-medium">No users found</p>
            <p className="text-sm text-muted mt-1">Invite a team member above to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">User</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Access</th>
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
                        {RoleDisplayName(u)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {u.role === 'admin' ? (
                        <span className="text-xs text-muted italic">All branches (admin)</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.branches.map((b: Branch) => (
                            <span key={b._id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-light text-primary">
                              <Building2 className="w-3 h-3" />
                              {b.name}
                            </span>
                          ))}
                          {(u.departments ?? []).map((d: Department) => (
                            <span key={d._id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                              <Tag className="w-3 h-3" />
                              {d.name}
                            </span>
                          ))}
                          {u.branches.length === 0 && (u.departments ?? []).length === 0 && (
                            <span className="text-xs text-muted italic">No access assigned</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u._id !== user?.id && (
                        <Button variant="outline" size="sm" onClick={() => handleOpenEdit(u)}>
                          Edit Role
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

      {/* Invite Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => { setInviteModalOpen(false); resetInviteForm(); }}
        title="Invite Team Member"
        description="Choose a role and, if relevant, which branches/departments they can access."
        size="md"
      >
        <form onSubmit={handleSendInvite}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-1">Email address</label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="teammate@example.com"
              autoFocus
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-1">Role</label>
            <select
              value={inviteRole === 'custom' ? inviteCustomRoleId : inviteRole}
              onChange={e => selectRole(e.target.value, setInviteRole, setInviteCustomRoleId)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            >
              {BUILT_IN_ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
              {customRoles.length > 0 && (
                <optgroup label="Custom roles">
                  {customRoles.map(r => (
                    <option key={r._id} value={r._id}>{r.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          {customRoles.length === 0 && (
            <div className="mb-4 flex items-center justify-between px-3 py-2 rounded-lg border border-dashed border-border">
              <p className="text-xs text-muted">No custom roles yet, like &quot;Branch Admin&quot; or &quot;Finance Admin&quot;.</p>
              <Button variant="outline" size="sm" type="button" onClick={() => setCreateRoleOpen(true)}>
                Create role
              </Button>
            </div>
          )}
          {renderScopePickers(
            inviteRole,
            inviteBranchIds,
            (id) => toggleSet(setInviteBranchIds, id),
            inviteDepartmentIds,
            (id) => toggleSet(setInviteDepartmentIds, id)
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => { setInviteModalOpen(false); resetInviteForm(); }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={inviteMutation.isPending} disabled={!inviteEmail.trim()}>
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create-role-inline, launched from the invite modal above when no custom roles exist yet */}
      <RoleFormModal
        isOpen={createRoleOpen}
        onClose={() => setCreateRoleOpen(false)}
        onSuccess={(role) => {
          setInviteRole('custom');
          setInviteCustomRoleId(role._id);
          setCreateRoleOpen(false);
        }}
      />

      {/* Edit Role Modal */}
      <Modal
        isOpen={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title="Edit Role & Access"
        description={editTarget ? `Update role and branch/department access for ${editTarget.firstName} ${editTarget.lastName}` : ''}
        size="md"
      >
        {editTarget && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1">Role</label>
              <select
                value={editRole === 'custom' ? editCustomRoleId : editRole}
                onChange={e => selectRole(e.target.value, setEditRole, setEditCustomRoleId)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              >
                {BUILT_IN_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
                {customRoles.length > 0 && (
                  <optgroup label="Custom roles">
                    {customRoles.map(r => (
                      <option key={r._id} value={r._id}>{r.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            {renderScopePickers(
              editRole,
              editBranchIds,
              (id) => toggleSet(setEditBranchIds, id),
              editDepartmentIds,
              (id) => toggleSet(setEditDepartmentIds, id)
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button onClick={handleSaveRole} isLoading={updateRoleMutation.isPending}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
