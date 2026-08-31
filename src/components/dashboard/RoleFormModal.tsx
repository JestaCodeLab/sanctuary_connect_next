'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check } from 'lucide-react';
import Modal from './Modal';
import { Button, Input } from '@/components/ui';
import { roleApi } from '@/lib/api';
import { PERMISSION_MODULES } from '@/lib/permissionKeys';
import type { Role } from '@/types';

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingRole?: Role | null;
  onSuccess?: (role: Role) => void;
}

export default function RoleFormModal({ isOpen, onClose, editingRole, onSuccess }: RoleFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editingRole;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Set<string>>(new Set());

  // Re-seed the form whenever the modal opens or the target role changes
  useEffect(() => {
    if (!isOpen) return;
    if (editingRole) {
      setName(editingRole.name);
      setDescription(editingRole.description || '');
      setPermissions(new Set(editingRole.permissions));
    } else {
      setName('');
      setDescription('');
      setPermissions(new Set());
    }
  }, [isOpen, editingRole]);

  const togglePermission = (key: string) => {
    setPermissions(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const createMutation = useMutation({
    mutationFn: () => roleApi.create({ name: name.trim(), description, permissions: Array.from(permissions) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role created');
      onSuccess?.(res.role);
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to create role'),
  });

  const updateMutation = useMutation({
    mutationFn: () => roleApi.update(editingRole!._id, { name: name.trim(), description, permissions: Array.from(permissions) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role updated');
      onSuccess?.(res.role);
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to update role'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Role name is required');
      return;
    }
    if (isEditing) updateMutation.mutate();
    else createMutation.mutate();
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Role' : 'Create Role'}
      description="Pick exactly which modules this role can access"
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1">Role name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Department Admin" autoFocus />
        </div>
        <div className="mb-5">
          <label className="block text-sm font-medium text-foreground mb-1">Description (optional)</label>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this role for?" />
        </div>

        <label className="block text-sm font-medium text-foreground mb-2">Permissions</label>
        <div className="space-y-4 max-h-80 overflow-y-auto pr-1 mb-5">
          {PERMISSION_MODULES.map((mod) => (
            <div key={mod.key} className="border border-border rounded-lg p-3">
              <p className="text-sm font-medium text-foreground mb-2">{mod.name}</p>
              <div className="space-y-1.5">
                {mod.permissions.map((perm) => {
                  const isSelected = permissions.has(perm.key);
                  return (
                    <button
                      key={perm.key}
                      type="button"
                      onClick={() => togglePermission(perm.key)}
                      className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg border transition-colors text-left ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-background'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-primary border-primary' : 'border-border'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm text-foreground">{perm.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isMutating}>
            {isEditing ? 'Save Changes' : 'Create Role'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
