'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Building2, MapPin, Plus, Edit2, Trash2 } from 'lucide-react';
import { Loader2 } from 'lucide-react';

import { PageHeader, Modal, StatsGrid, Badge, EmptyState } from '@/components/dashboard';
import { Button, Input, Card, Checkbox } from '@/components/ui';
import { organizationApi } from '@/lib/api';
import { branchSchema, type BranchFormData } from '@/lib/validations';

export default function BranchesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: orgData, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: () => organizationApi.getMyOrganization(),
  });

  const branches = orgData?.branches ?? [];
  const organization = orgData?.organization;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      radius: 200,
      isHeadOffice: false,
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: (data: BranchFormData) => {
      if (!organization?._id) throw new Error('Organization not found');
      return organizationApi.createBranch(organization._id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Branch created successfully');
      reset();
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Failed to create branch';
      toast.error(message);
    },
  });

  const onSubmit = (data: BranchFormData) => {
    createBranchMutation.mutate(data);
  };

  const handleOpenModal = () => {
    reset();
    setIsModalOpen(true);
  };

  const headOffice = branches.find((b) => b.isHeadOffice);

  const stats = [
    {
      label: 'Total Branches',
      value: branches.length,
      icon: Building2,
    },
    {
      label: 'Head Office',
      value: headOffice?.name ?? 'Not set',
      icon: MapPin,
    },
    {
      label: 'Structure',
      value: organization?.structure === 'multi' ? 'Multi-Branch' : 'Single Branch',
      icon: Building2,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Branches"
        description="Manage your church locations"
        actionLabel="Add Branch"
        actionIcon={Plus}
        onAction={handleOpenModal}
      />

      <StatsGrid stats={stats} />

      {branches.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No branches yet"
          description="Add your first church branch to get started with managing your locations."
          actionLabel="Add Branch"
          onAction={handleOpenModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <Card key={branch._id} padding="md">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{branch.name}</h3>
                    {branch.isHeadOffice && (
                      <Badge variant="info">Head Office</Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1.5"
                  onClick={() => {
                    // Edit functionality placeholder
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2 mt-4">
                {(branch.address || branch.city || branch.state) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted">
                      {[branch.address, branch.city, branch.state, branch.zipCode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    <span className="block w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <p className="text-sm text-muted">
                    Geofence radius: {branch.geofenceRadius}m
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Branch Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Branch"
        description="Create a new church branch location"
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

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              placeholder="City"
              error={errors.city?.message}
              {...register('city')}
            />
            <Input
              label="State"
              placeholder="State"
              error={errors.state?.message}
              {...register('state')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={createBranchMutation.isPending || isSubmitting}
            >
              Create Branch
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
