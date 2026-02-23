'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Plus, Users, Building2, Trash2, Edit2, ChevronDown } from 'lucide-react';
import { departmentsApi, organizationApi } from '@/lib/api';
import { departmentSchema, type DepartmentFormData } from '@/lib/validations';
import { Card, Button, Input, Select } from '@/components/ui';
import PageHeader from '@/components/dashboard/PageHeader';
import Modal from '@/components/dashboard/Modal';
import FeatureGate from '@/components/dashboard/FeatureGate';
import type { Department, Branch } from '@/types';

function DepartmentsContent() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.getAll,
  });

  const { data: orgData } = useQuery({
    queryKey: ['my-organization'],
    queryFn: organizationApi.getMyOrganization,
  });

  const branches = orgData?.branches ?? [];

  const branchOptions = branches.map((b: Branch) => ({
    value: b._id,
    label: b.name,
  }));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema) as any,
  });

  const createMutation = useMutation({
    mutationFn: (data: DepartmentFormData) =>
      departmentsApi.create({
        organizationId: orgData?.organization?._id || '',
        ...data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department created');
      closeModal();
    },
    onError: () => toast.error('Failed to create department'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DepartmentFormData> }) =>
      departmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department updated');
      closeModal();
    },
    onError: () => toast.error('Failed to update department'),
  });

  const deleteMutation = useMutation({
    mutationFn: departmentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department deleted');
    },
    onError: () => toast.error('Failed to delete department'),
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingDept(null);
    reset({ name: '', description: '', branchId: '', leaderId: '' });
  };

  const openCreate = () => {
    reset({ name: '', description: '', branchId: '', leaderId: '' });
    setEditingDept(null);
    setShowModal(true);
  };

  const openEdit = (dept: Department) => {
    setEditingDept(dept);
    reset({
      name: dept.name,
      description: dept.description || '',
      branchId: typeof dept.branchId === 'object' ? dept.branchId._id : dept.branchId,
    });
    setShowModal(true);
  };

  const onSubmit = (data: DepartmentFormData) => {
    if (editingDept) {
      updateMutation.mutate({ id: editingDept._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleBranch = (branchId: string) => {
    setExpandedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(branchId)) next.delete(branchId);
      else next.add(branchId);
      return next;
    });
  };

  // Group departments by branch
  const grouped = new Map<string, { branch: { _id: string; name: string }; departments: Department[] }>();
  departments.forEach((dept) => {
    const branchId = typeof dept.branchId === 'object' ? dept.branchId._id : dept.branchId;
    const branchName = typeof dept.branchId === 'object' ? dept.branchId.name : 'Unknown Branch';
    if (!grouped.has(branchId)) {
      grouped.set(branchId, { branch: { _id: branchId, name: branchName }, departments: [] });
    }
    grouped.get(branchId)!.departments.push(dept);
  });

  // Auto-expand all branches initially
  if (expandedBranches.size === 0 && grouped.size > 0) {
    const allBranchIds = new Set(Array.from(grouped.keys()));
    if (allBranchIds.size > 0) {
      setExpandedBranches(allBranchIds);
    }
  }

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Manage departments within your branches"
        actionLabel="New Department"
        actionIcon={Plus}
        onAction={openCreate}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : departments.length === 0 ? (
        <Card className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No departments yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            Create departments to organize your members
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.values()).map(({ branch, departments: branchDepts }) => (
            <Card key={branch._id} padding="none">
              <button
                onClick={() => toggleBranch(branch._id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{branch.name}</h3>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                    {branchDepts.length} dept{branchDepts.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedBranches.has(branch._id) ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedBranches.has(branch._id) && (
                <div className="border-t border-gray-100 dark:border-gray-700">
                  {branchDepts.map((dept) => (
                    <div
                      key={dept._id}
                      className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-gray-700/50 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <Link
                            href={`/dashboard/departments/${dept._id}`}
                            className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-primary"
                          >
                            {dept.name}
                          </Link>
                          {dept.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                              {dept.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {dept.members?.length || 0} member{(dept.members?.length || 0) !== 1 ? 's' : ''}
                        </span>
                        <button
                          onClick={() => openEdit(dept)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this department?')) {
                              deleteMutation.mutate(dept._id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          title={editingDept ? 'Edit Department' : 'New Department'}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Department Name"
              placeholder="e.g. Choir, Youth Ministry"
              error={errors.name?.message}
              {...register('name')}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                placeholder="Brief description of the department..."
                rows={3}
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3AAFDC] focus:border-transparent resize-none"
                {...register('description')}
              />
            </div>
            <Select
              label="Branch"
              options={branchOptions}
              placeholder="Select branch"
              error={errors.branchId?.message}
              {...register('branchId')}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                {editingDept ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function DepartmentsPage() {
  return (
    <FeatureGate featureKey="department_management" featureName="Department Management">
      <DepartmentsContent />
    </FeatureGate>
  );
}
