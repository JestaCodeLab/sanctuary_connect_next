'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Shield, Plus, Pencil, Ban } from 'lucide-react';

import { PageHeader, Badge } from '@/components/dashboard';
import RoleFormModal from '@/components/dashboard/RoleFormModal';
import { Button, Card } from '@/components/ui';
import { roleApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Role } from '@/types';

export default function CustomRolesTab() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleApi.list(),
  });
  const roles: Role[] = data?.roles ?? [];

  const openCreate = () => {
    setEditingRole(null);
    setModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setModalOpen(true);
  };

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => roleApi.deactivate(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success(
        res.assigneeCount > 0
          ? `Role deactivated. ${res.assigneeCount} user(s) currently have it - reassign them separately.`
          : 'Role deactivated'
      );
    },
    onError: () => toast.error('Failed to deactivate role'),
  });

  if (user?.role !== 'admin') {
    return (
      <Card padding="lg">
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-foreground font-medium">Admin access required</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custom Roles"
        description={'Create roles like "Department Admin" or "Finance Admin" with exactly the access they need'}
        actionLabel="Create Role"
        actionIcon={Plus}
        onAction={openCreate}
      />

      <Card padding="none">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : roles.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-foreground font-medium">No custom roles yet</p>
            <p className="text-sm text-muted mt-1">Create one to unlock role selection when inviting team members.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {roles.map((role) => (
              <div key={role._id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{role.name}</p>
                    <Badge variant={role.isActive ? 'success' : 'muted'}>{role.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  {role.description && <p className="text-xs text-muted mt-0.5">{role.description}</p>}
                  <p className="text-xs text-muted mt-1">{role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'} granted</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(role)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  {role.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deactivateMutation.mutate(role._id)}
                      isLoading={deactivateMutation.isPending}
                    >
                      <Ban className="w-3.5 h-3.5 mr-1" /> Deactivate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <RoleFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingRole={editingRole}
      />
    </div>
  );
}
