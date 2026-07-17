'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Receipt, Plus, Trash2, Settings, Check, X } from 'lucide-react';

import { PageHeader, StatsGrid, Badge, EmptyState, Modal } from '@/components/dashboard';
import { Button, Input, Card, Select } from '@/components/ui';
import { expensesApi, financeApi } from '@/lib/api';
import { expenseSchema, type ExpenseFormData, expenseCategorySchema, type ExpenseCategoryFormData } from '@/lib/validations';
import { useCurrency } from '@/lib/hooks/useCurrency';
import BranchField from '@/components/dashboard/BranchField';
import { FinanceAccessGuard } from '@/components/finance/FinanceAccessGuard';
import { useAuthStore } from '@/store/authStore';
import type { Expense, ExpenseCategory } from '@/types';

const paymentMethodOptions = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
];

const statusFilterOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const statusBadgeVariant: Record<string, 'info' | 'success' | 'warning' | 'error' | 'muted'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ManageCategoriesModal({ isOpen, onClose, categories }: {
  isOpen: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
}) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ExpenseCategoryFormData>({
    resolver: zodResolver(expenseCategorySchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: ExpenseCategoryFormData) => financeApi.createExpenseCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'expense-categories'] });
      reset();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to add expense category');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; enabled?: boolean } }) =>
      financeApi.updateExpenseCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'expense-categories'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to update expense category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteExpenseCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'expense-categories'] });
      toast.success('Expense category deleted');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to delete expense category');
    },
  });

  const handleDelete = (category: ExpenseCategory) => {
    if (!window.confirm(`Delete expense category "${category.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(category._id);
  };

  const startRename = (category: ExpenseCategory) => {
    setEditingId(category._id);
    setEditingName(category.name);
  };

  const saveRename = (id: string) => {
    if (!editingName.trim()) return;
    updateMutation.mutate({ id, data: { name: editingName.trim() } });
    setEditingId(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Expense Categories">
      <div className="space-y-4">
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {categories.map((category) => (
            <div key={category._id} className="flex items-center justify-between gap-2 px-3 py-2 border border-border rounded-lg">
              {editingId === category._id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1"
                    autoFocus
                  />
                  <button onClick={() => saveRename(category._id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button onClick={() => startRename(category)} className="text-sm text-foreground text-left flex-1 hover:underline">
                    {category.name}
                    {category.isDefault && <span className="ml-2 text-xs text-muted">(default)</span>}
                  </button>
                  <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={category.enabled}
                      onChange={(e) => updateMutation.mutate({ id: category._id, data: { enabled: e.target.checked } })}
                    />
                    Enabled
                  </label>
                  <button
                    onClick={() => handleDelete(category)}
                    disabled={deleteMutation.isPending}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded disabled:opacity-50"
                    title="Remove category"
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
            <Input placeholder="New category name" {...register('name')} />
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

function RejectExpenseModal({ expense, onClose, onRejected }: { expense: Expense | null; onClose: () => void; onRejected: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const rejectMutation = useMutation({
    mutationFn: () => expensesApi.reject(expense!._id, reason.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Expense rejected');
      setReason('');
      onRejected();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to reject expense'),
  });

  return (
    <Modal isOpen={!!expense} onClose={onClose} title="Reject Expense">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Reason for rejection</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this expense is being rejected..."
            className="w-full px-3 py-2 rounded-lg border border-input bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            disabled={!reason.trim() || rejectMutation.isPending}
            isLoading={rejectMutation.isPending}
            onClick={() => rejectMutation.mutate()}
          >
            Reject Expense
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ExpensesPageContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<Expense | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectTarget, setRejectTarget] = useState<Expense | null>(null);
  const { formatCurrency } = useCurrency();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', statusFilter],
    queryFn: () => expensesApi.getAll(statusFilter ? { status: statusFilter as 'pending' | 'approved' | 'rejected' } : undefined),
  });

  // Stat cards always reflect approved-only totals (matching Overview/Reports),
  // independent of whatever status the table below is currently filtered to.
  const { data: approvedExpenses = [] } = useQuery({
    queryKey: ['expenses', 'approved'],
    queryFn: () => expensesApi.getAll({ status: 'approved' }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['finance', 'expense-categories'],
    queryFn: financeApi.getExpenseCategories,
  });

  const enabledCategoryOptions = categories
    .filter((c) => c.enabled)
    .map((c) => ({ value: c._id, label: c.name }));

  // The edit form must still be able to show a category that's since been
  // disabled — otherwise saving without touching the dropdown would silently
  // reassign the expense to whatever option happens to render first.
  const editCategoryOptions = viewTarget && viewTarget.categoryId && !enabledCategoryOptions.some((o) => o.value === viewTarget.categoryId)
    ? [...enabledCategoryOptions, { value: viewTarget.categoryId, label: `${viewTarget.category} (disabled)` }]
    : enabledCategoryOptions;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      amount: undefined,
      categoryId: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      vendor: '',
      paymentMethod: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ExpenseFormData) => expensesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Expense recorded successfully');
      reset();
      setIsModalOpen(false);
    },
    onError: () => toast.error('Failed to record expense'),
  });

  const editForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema) as any,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseFormData }) => expensesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Expense updated successfully');
      setViewTarget(null);
      setIsEditMode(false);
      editForm.reset();
    },
    onError: () => toast.error('Failed to update expense'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Expense deleted');
      setViewTarget(null);
    },
    onError: () => toast.error('Failed to delete expense'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => expensesApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Expense approved');
      setViewTarget(null);
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to approve expense'),
  });

  const handleView = (expense: Expense) => {
    setViewTarget(expense);
    setIsEditMode(false);
  };

  const handleStartEdit = () => {
    if (!viewTarget) return;
    editForm.reset({
      amount: viewTarget.amount,
      categoryId: viewTarget.categoryId || '',
      description: viewTarget.description || '',
      date: new Date(viewTarget.date).toISOString().split('T')[0],
      vendor: viewTarget.vendor || '',
      paymentMethod: viewTarget.paymentMethod || '',
    });
    setIsEditMode(true);
  };

  const totalExpenses = approvedExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);
  const totalCount = expenses.length;

  const now = new Date();
  const thisMonthTotal = approvedExpenses
    .filter((e: Expense) => {
      const date = new Date(e.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum: number, e: Expense) => sum + e.amount, 0);

  const categoryCounts: Record<string, number> = {};
  approvedExpenses.forEach((e: Expense) => {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
  });
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];

  const stats = [
    { label: 'Total Expenses', value: formatCurrency(totalExpenses), icon: Receipt },
    { label: 'Total Records', value: totalCount.toLocaleString(), icon: Receipt },
    { label: 'This Month', value: formatCurrency(thisMonthTotal), icon: Receipt },
    { label: 'Top Category', value: topCategory ? topCategory[0].charAt(0).toUpperCase() + topCategory[0].slice(1) : '—', icon: Receipt },
  ];

  return (
    <div>
      <PageHeader title="Expenses" description="Track and manage church expenses" />

      <div className="flex items-center justify-end gap-3 -mt-4 mb-8">
        <div className="w-40">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={statusFilterOptions} />
        </div>
        <Button variant="outline" onClick={() => setIsManageCategoriesOpen(true)} leftIcon={<Settings className="w-4 h-4" />}>
          Manage Categories
        </Button>
        <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Record Expense
        </Button>
      </div>

      <StatsGrid stats={stats} />

      <Card padding="none">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Expense Records</h2>
          <p className="text-sm text-muted mt-1">A record of all expenses</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expenses yet"
            description="Record your first expense to start tracking."
            actionLabel="Record Expense"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Description</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Category</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Vendor</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((expense: Expense) => (
                  <tr key={expense._id} className="hover:bg-background transition-colors">
                    <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">{formatDate(expense.date)}</td>
                    <td className="px-6 py-4 text-sm text-foreground max-w-[200px] truncate">
                      {expense.description || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground whitespace-nowrap">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="muted">{expense.category}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted whitespace-nowrap">{expense.vendor || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={statusBadgeVariant[expense.status] || 'muted'}>
                        {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => handleView(expense)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Record Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); reset(); }}
        title="Record Expense"
        description="Enter the details of the expense."
        size="lg"
      >
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-5">
          <BranchField value={watch('branchId')} onChange={(v) => setValue('branchId', v)} />
          <Input label="Amount" type="number" step="0.01" placeholder="0.00" error={errors.amount?.message} {...register('amount')} />
          <Select label="Category" options={enabledCategoryOptions} placeholder="Select category" error={errors.categoryId?.message} {...register('categoryId')} />
          <Input label="Date" type="date" error={errors.date?.message} {...register('date')} />
          <Input label="Vendor" placeholder="Vendor name" error={errors.vendor?.message} {...register('vendor')} />
          <Select label="Payment Method" options={paymentMethodOptions} placeholder="Select payment method" error={errors.paymentMethod?.message} {...register('paymentMethod')} />
          <div className="w-full">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              id="description"
              rows={3}
              placeholder="Describe this expense..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register('description')}
            />
            {errors.description?.message && <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">{errors.description.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Record Expense</Button>
          </div>
        </form>
      </Modal>

      {/* View/Edit Expense Modal */}
      <Modal
        isOpen={viewTarget !== null}
        onClose={() => { setViewTarget(null); setIsEditMode(false); editForm.reset(); }}
        title={isEditMode ? 'Edit Expense' : 'Expense Details'}
        size="lg"
      >
        {viewTarget && !isEditMode && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-muted">Date</p>
                <p className="text-foreground font-medium">{formatDate(viewTarget.date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Amount</p>
                <p className="text-foreground font-medium">{formatCurrency(viewTarget.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Category</p>
                <p className="text-foreground capitalize">{viewTarget.category}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Vendor</p>
                <p className="text-foreground">{viewTarget.vendor || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Payment Method</p>
                <p className="text-foreground capitalize">{viewTarget.paymentMethod?.replace('_', ' ') || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Status</p>
                <Badge variant={statusBadgeVariant[viewTarget.status] || 'muted'}>
                  {viewTarget.status.charAt(0).toUpperCase() + viewTarget.status.slice(1)}
                </Badge>
              </div>
              {viewTarget.submittedBy && (
                <div>
                  <p className="text-sm text-muted">Submitted By</p>
                  <p className="text-foreground">{viewTarget.submittedBy.firstName} {viewTarget.submittedBy.lastName}</p>
                </div>
              )}
              {viewTarget.approvedBy && (
                <div>
                  <p className="text-sm text-muted">Approved By</p>
                  <p className="text-foreground">{viewTarget.approvedBy.firstName} {viewTarget.approvedBy.lastName}</p>
                </div>
              )}
              {viewTarget.rejectionReason && (
                <div className="col-span-2">
                  <p className="text-sm text-muted">Rejection Reason</p>
                  <p className="text-foreground">{viewTarget.rejectionReason}</p>
                </div>
              )}
              {viewTarget.description && (
                <div className="col-span-2">
                  <p className="text-sm text-muted">Description</p>
                  <p className="text-foreground">{viewTarget.description}</p>
                </div>
              )}
            </div>
            <div className="flex justify-between pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:border-red-300"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this expense?')) {
                    deleteMutation.mutate(viewTarget._id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setViewTarget(null); setIsEditMode(false); }}>Close</Button>
                {isAdmin && viewTarget.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                      onClick={() => setRejectTarget(viewTarget)}
                    >
                      Reject
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      isLoading={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(viewTarget._id)}
                    >
                      Approve
                    </Button>
                  </>
                )}
                <Button onClick={handleStartEdit}>Edit</Button>
              </div>
            </div>
          </div>
        )}
        {viewTarget && isEditMode && (
          <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate({ id: viewTarget._id, data }))} className="space-y-5">
            <Input label="Amount" type="number" step="0.01" error={editForm.formState.errors.amount?.message} {...editForm.register('amount')} />
            <Select label="Category" options={editCategoryOptions} placeholder="Select category" error={editForm.formState.errors.categoryId?.message} {...editForm.register('categoryId')} />
            <Input label="Date" type="date" error={editForm.formState.errors.date?.message} {...editForm.register('date')} />
            <Input label="Vendor" placeholder="Vendor name" error={editForm.formState.errors.vendor?.message} {...editForm.register('vendor')} />
            <Select label="Payment Method" options={paymentMethodOptions} placeholder="Select payment method" error={editForm.formState.errors.paymentMethod?.message} {...editForm.register('paymentMethod')} />
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <textarea rows={3} placeholder="Describe this expense..." className="w-full px-3 py-2 rounded-lg border border-input bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" {...editForm.register('description')} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditMode(false)}>Cancel</Button>
              <Button type="submit" isLoading={updateMutation.isPending}>Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      <ManageCategoriesModal
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={categories}
      />

      <RejectExpenseModal
        expense={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onRejected={() => { setRejectTarget(null); setViewTarget(null); }}
      />
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <FinanceAccessGuard setupPath="/finance/setup">
      <ExpensesPageContent />
    </FinanceAccessGuard>
  );
}
