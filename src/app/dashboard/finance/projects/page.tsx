'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Target, Plus, TrendingUp, Wallet, Calendar, Pencil, Settings, Check, X, Trash2 } from 'lucide-react';

import { PageHeader, StatsGrid, Badge, EmptyState, Modal } from '@/components/dashboard';
import { Button, Input, Card, ProgressBar, Select } from '@/components/ui';
import { donationsApi, financeApi, membersApi } from '@/lib/api';
import { donationSchema, projectSchema, type DonationFormData, type ProjectFormData, projectGroupSchema, type ProjectGroupFormData } from '@/lib/validations';
import { useCurrency } from '@/lib/hooks/useCurrency';
import { FinanceAccessGuard } from '@/components/finance/FinanceAccessGuard';
import type { Donation, Project, ProjectGroup } from '@/types';

const paymentMethodOptions = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'online', label: 'Online' },
];

function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function NewProjectModal({ isOpen, onClose, groups }: { isOpen: boolean; onClose: () => void; groups: ProjectGroup[] }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema) as any,
  });

  const groupOptions = [
    { value: '', label: 'No group' },
    ...groups.filter((g) => g.enabled).map((g) => ({ value: g._id, label: g.name })),
  ];

  const createMutation = useMutation({
    mutationFn: (data: ProjectFormData) => financeApi.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'projects'] });
      toast.success('Project created successfully');
      reset();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to create project');
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Project">
      <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Project Name</label>
          <Input placeholder="e.g. Building Fund" {...register('name')} />
          {errors.name && <span className="text-sm text-red-600">{errors.name.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Description (Optional)</label>
          <Input placeholder="What is this project for?" {...register('description')} />
        </div>

        <Select label="Group (Optional)" options={groupOptions} {...register('groupId')} />

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Target Amount (Optional)</label>
          <Input type="number" placeholder="0.00" {...register('targetAmount')} />
          {errors.targetAmount && <span className="text-sm text-red-600">{errors.targetAmount.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Target Date (Optional)</label>
          <Input type="date" {...register('targetDate')} />
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending} isLoading={createMutation.isPending} className="flex-1">
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditProjectModal({ project, groups, onClose }: { project: Project | null; groups: ProjectGroup[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const currentGroupId = typeof project?.groupId === 'string' ? project.groupId : project?.groupId?._id;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema) as any,
    values: project ? {
      name: project.name,
      description: project.description || '',
      targetAmount: project.targetAmount || undefined,
      targetDate: project.targetDate ? new Date(project.targetDate).toISOString().split('T')[0] : '',
      groupId: currentGroupId || '',
    } : undefined,
  });

  // Same guard as expense categories: keep a since-disabled group selectable
  // in the edit form so saving doesn't silently reassign it.
  const groupOptions = [
    { value: '', label: 'No group' },
    ...groups.filter((g) => g.enabled || g._id === currentGroupId).map((g) => ({ value: g._id, label: g.name })),
  ];

  const updateMutation = useMutation({
    mutationFn: (data: ProjectFormData) => financeApi.updateProject(project!._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'projects'] });
      toast.success('Project updated successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to update project');
    },
  });

  return (
    <Modal isOpen={!!project} onClose={onClose} title="Edit Project">
      <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Project Name</label>
          <Input {...register('name')} />
          {errors.name && <span className="text-sm text-red-600">{errors.name.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Description (Optional)</label>
          <Input {...register('description')} />
        </div>

        <Select label="Group (Optional)" options={groupOptions} {...register('groupId')} />

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Target Amount (Optional)</label>
          <Input type="number" {...register('targetAmount')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Target Date (Optional)</label>
          <Input type="date" {...register('targetDate')} />
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending} isLoading={updateMutation.isPending} className="flex-1">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ManageGroupsModal({ isOpen, onClose, groups }: {
  isOpen: boolean;
  onClose: () => void;
  groups: ProjectGroup[];
}) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectGroupFormData>({
    resolver: zodResolver(projectGroupSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: ProjectGroupFormData) => financeApi.createProjectGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'project-groups'] });
      reset();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to add project group');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; enabled?: boolean } }) =>
      financeApi.updateProjectGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'project-groups'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to update project group');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteProjectGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'project-groups'] });
      toast.success('Project group deleted');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to delete project group');
    },
  });

  const handleDelete = (group: ProjectGroup) => {
    if (!window.confirm(`Delete project group "${group.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(group._id);
  };

  const startRename = (group: ProjectGroup) => {
    setEditingId(group._id);
    setEditingName(group.name);
  };

  const saveRename = (id: string) => {
    if (!editingName.trim()) return;
    updateMutation.mutate({ id, data: { name: editingName.trim() } });
    setEditingId(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Project Groups">
      <div className="space-y-4">
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {groups.map((group) => (
            <div key={group._id} className="flex items-center justify-between gap-2 px-3 py-2 border border-border rounded-lg">
              {editingId === group._id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1"
                    autoFocus
                  />
                  <button onClick={() => saveRename(group._id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button onClick={() => startRename(group)} className="text-sm text-foreground text-left flex-1 hover:underline">
                    {group.name}
                    {group.isDefault && <span className="ml-2 text-xs text-muted">(default)</span>}
                  </button>
                  <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={group.enabled}
                      onChange={(e) => updateMutation.mutate({ id: group._id, data: { enabled: e.target.checked } })}
                    />
                    Enabled
                  </label>
                  <button
                    onClick={() => handleDelete(group)}
                    disabled={deleteMutation.isPending}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded disabled:opacity-50"
                    title="Remove group"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmit((data) => createMutation.mutate(data))}
          className="flex items-start gap-2 pt-4 border-t border-border"
        >
          <div className="flex-1">
            <Input placeholder="New group name" {...register('name')} />
            {errors.name && <span className="text-sm text-red-600">{errors.name.message}</span>}
          </div>
          <Button type="submit" disabled={createMutation.isPending} isLoading={createMutation.isPending}>
            Add
          </Button>
        </form>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}

function RecordDonationModal({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: () => membersApi.getAll() });

  const donorOptions = [
    { value: '', label: 'Anonymous' },
    ...members.map((m: any) => ({ value: m._id, label: `${m.firstName} ${m.lastName}` })),
  ];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema) as any,
    defaultValues: {
      donorId: '',
      amount: undefined,
      donationType: 'project',
      donationDate: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      notes: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: DonationFormData) => donationsApi.create({ ...data, fundBucketId: project!._id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'projects'] });
      toast.success('Donation recorded successfully');
      reset();
      onClose();
    },
    onError: () => {
      toast.error('Failed to record donation');
    },
  });

  return (
    <Modal isOpen={!!project} onClose={onClose} title={`Record Donation — ${project?.name ?? ''}`}>
      <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Donor</label>
          <select
            {...register('donorId')}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {donorOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Amount</label>
          <Input type="number" placeholder="0.00" {...register('amount', { valueAsNumber: true })} />
          {errors.amount && <span className="text-sm text-red-600">{errors.amount.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Payment Method</label>
          <select
            {...register('paymentMethod')}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select method...</option>
            {paymentMethodOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Date</label>
          <Input type="date" {...register('donationDate')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Notes (Optional)</label>
          <Input placeholder="Add any notes about this donation..." {...register('notes')} />
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending} isLoading={createMutation.isPending} className="flex-1">
            Record Donation
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ProjectCard({ project, onRecordDonation, onEdit }: {
  project: Project;
  onRecordDonation: () => void;
  onEdit: () => void;
}) {
  const { formatCurrency } = useCurrency();
  const progress = project.targetAmount ? (project.raisedAmount / project.targetAmount) * 100 : 0;

  return (
    <Card padding="md" className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{project.name}</h3>
          {project.description && <p className="text-xs text-muted mt-0.5">{project.description}</p>}
          {project.groupId && typeof project.groupId !== 'string' && (
            <Badge variant="info" className="mt-1">{project.groupId.name}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {project.status === 'archived' && <Badge variant="muted">Archived</Badge>}
          {project.status === 'completed' && <Badge variant="success">Completed</Badge>}
          <button onClick={onEdit} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-muted">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-2 mb-3">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-lg font-bold text-foreground">{formatCurrency(project.raisedAmount)}</span>
          {project.targetAmount ? (
            <span className="text-xs text-muted">of {formatCurrency(project.targetAmount)}</span>
          ) : (
            <span className="text-xs text-muted">raised</span>
          )}
        </div>
        {project.targetAmount ? <ProgressBar progress={progress} size="sm" /> : null}
      </div>

      <div className="flex items-center justify-between text-xs text-muted mt-auto">
        <span>{project.donationCount} donation{project.donationCount !== 1 ? 's' : ''}</span>
        {project.targetDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {formatDate(project.targetDate)}
          </span>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <Link href={`/dashboard/finance/projects/${project._id}`} className="flex-1">
          <Button size="sm" variant="outline" className="w-full">
            View Report
          </Button>
        </Link>
        <Button size="sm" className="flex-1" onClick={onRecordDonation}>
          Record Donation
        </Button>
      </div>
    </Card>
  );
}

function ProjectsPageContent() {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isManageGroupsOpen, setIsManageGroupsOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [donationTarget, setDonationTarget] = useState<Project | null>(null);
  const [groupFilter, setGroupFilter] = useState('');
  const { formatCurrency } = useCurrency();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['finance', 'projects'],
    queryFn: financeApi.getProjects,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['finance', 'project-groups'],
    queryFn: financeApi.getProjectGroups,
  });

  const filteredProjects = groupFilter
    ? projects.filter((p) => (typeof p.groupId === 'string' ? p.groupId : p.groupId?._id) === groupFilter)
    : projects;

  // Keep these three stats consistent with each other — all "active" (non-archived) only.
  const activeProjects = filteredProjects.filter((p) => p.status !== 'archived');
  const totalRaised = activeProjects.reduce((sum, p) => sum + p.raisedAmount, 0);
  const totalTarget = activeProjects.reduce((sum, p) => sum + (p.targetAmount || 0), 0);

  const stats = [
    { label: 'Active Projects', value: activeProjects.length.toLocaleString(), icon: Target },
    { label: 'Total Raised', value: formatCurrency(totalRaised), icon: Wallet },
    { label: 'Combined Goal', value: formatCurrency(totalTarget), icon: TrendingUp },
  ];

  const groupFilterOptions = [
    { value: '', label: 'All Groups' },
    ...groups.map((g) => ({ value: g._id, label: g.name })),
  ];

  return (
    <div>
      <PageHeader title="Projects" description="Track mission, building, and other special-fund campaigns" />

      <div className="flex items-center justify-end gap-3 -mt-4 mb-8">
        <div className="w-48">
          <Select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} options={groupFilterOptions} />
        </div>
        <Button variant="outline" onClick={() => setIsManageGroupsOpen(true)} leftIcon={<Settings className="w-4 h-4" />}>
          Manage Groups
        </Button>
        <Button onClick={() => setIsNewProjectOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          New Project
        </Button>
      </div>

      <StatsGrid stats={stats} />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          title="No Projects Yet"
          description="Create a project to track mission trips, building funds, or other special campaigns."
          icon={Target}
          actionLabel="New Project"
          onAction={() => setIsNewProjectOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onRecordDonation={() => setDonationTarget(project)}
              onEdit={() => setEditTarget(project)}
            />
          ))}
        </div>
      )}

      <NewProjectModal isOpen={isNewProjectOpen} onClose={() => setIsNewProjectOpen(false)} groups={groups} />
      <EditProjectModal project={editTarget} groups={groups} onClose={() => setEditTarget(null)} />
      <RecordDonationModal project={donationTarget} onClose={() => setDonationTarget(null)} />
      <ManageGroupsModal isOpen={isManageGroupsOpen} onClose={() => setIsManageGroupsOpen(false)} groups={groups} />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <FinanceAccessGuard>
      <ProjectsPageContent />
    </FinanceAccessGuard>
  );
}
