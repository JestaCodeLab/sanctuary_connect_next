'use client';

import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { Button, Input, Checkbox } from '@/components/ui';
import { organizationApi } from '@/lib/api';
import { branchSchema, type BranchFormData } from '@/lib/validations';
import type { Branch } from '@/types';

interface BranchFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  editingBranch?: Branch | null;
  onSuccess?: (branch: Branch) => void;
}

const emptyDefaults: BranchFormData = {
  name: '',
  address: '',
  city: '',
  suburb: '',
  region: '',
  zipCode: '',
  radius: 200,
  isHeadOffice: false,
};

export default function BranchFormModal({
  isOpen,
  onClose,
  organizationId,
  editingBranch,
  onSuccess,
}: BranchFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editingBranch;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: emptyDefaults,
  });

  // Re-seed the form whenever the modal opens or the target branch changes
  useEffect(() => {
    if (!isOpen) return;
    if (editingBranch) {
      reset({
        name: editingBranch.name,
        address: editingBranch.address || '',
        city: editingBranch.city || '',
        suburb: editingBranch.suburb || '',
        region: editingBranch.region || '',
        zipCode: editingBranch.zipCode || '',
        radius: editingBranch.geofenceRadius || 200,
        isHeadOffice: editingBranch.isHeadOffice || false,
      });
    } else {
      reset(emptyDefaults);
    }
  }, [isOpen, editingBranch, reset]);

  const createBranchMutation = useMutation({
    mutationFn: (data: BranchFormData) => organizationApi.createBranch(organizationId, data),
    onSuccess: (branch) => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Branch created successfully');
      onSuccess?.(branch);
      handleClose();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Failed to create branch';
      toast.error(message);
    },
  });

  const updateBranchMutation = useMutation({
    mutationFn: (data: BranchFormData) => {
      if (!editingBranch?._id) throw new Error('Branch not found');
      return organizationApi.updateBranch(organizationId, editingBranch._id, data);
    },
    onSuccess: (branch) => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Branch updated successfully');
      onSuccess?.(branch);
      handleClose();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Failed to update branch';
      toast.error(message);
    },
  });

  const onSubmit = (data: BranchFormData) => {
    if (isEditing) {
      updateBranchMutation.mutate(data);
    } else {
      createBranchMutation.mutate(data);
    }
  };

  const handleClose = () => {
    reset(emptyDefaults);
    onClose();
  };

  const isMutating = createBranchMutation.isPending || updateBranchMutation.isPending || isSubmitting;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Branch' : 'Add Branch'}
      description={isEditing ? 'Update branch details' : 'Create a new church branch location'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Branch Name"
          placeholder="e.g. Main Campus"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Address"
          placeholder="Street address"
          error={errors.address?.message}
          {...register('address')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="City"
            placeholder="City"
            error={errors.city?.message}
            {...register('city')}
          />
          <Input
            label="Suburb"
            placeholder="Suburb"
            error={errors.suburb?.message}
            {...register('suburb')}
          />
        </div>

        <Input
          label="Region"
          placeholder="Region"
          error={errors.region?.message}
          {...register('region')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Zip Code"
            placeholder="Zip code"
            error={errors.zipCode?.message}
            {...register('zipCode')}
          />
          <Input
            label="Geofence Radius (m)"
            type="number"
            placeholder="50 - 500"
            error={errors.radius?.message}
            {...register('radius', { valueAsNumber: true })}
          />
        </div>

        <Checkbox
          label="Set as Head Office"
          {...register('isHeadOffice')}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isMutating}>
            {isEditing ? 'Save Changes' : 'Create Branch'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
