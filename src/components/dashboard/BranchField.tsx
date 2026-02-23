'use client';

import { useBranchStore } from '@/store/branchStore';

interface BranchFieldProps {
  value?: string;
  onChange: (branchId: string) => void;
  error?: string;
  required?: boolean;
}

export default function BranchField({ value, onChange, error, required = false }: BranchFieldProps) {
  const { branches, selectedBranchId } = useBranchStore();

  // If a specific branch is selected in the header, auto-fill and show read-only
  if (selectedBranchId) {
    const branch = branches.find(b => b._id === selectedBranchId);
    // Ensure the value is synced
    if (value !== selectedBranchId) {
      onChange(selectedBranchId);
    }
    return (
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Branch</label>
        <div className="w-full px-4 py-2.5 rounded-lg border border-border bg-background/50 text-sm text-muted">
          {branch?.name || 'Selected Branch'}
        </div>
      </div>
    );
  }

  // "All Branches" mode — show dropdown requiring branch selection
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        Branch {required && <span className="text-error">*</span>}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-4 py-2.5 rounded-lg border ${
          error ? 'border-error' : 'border-border'
        } bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary`}
      >
        <option value="">Select a branch</option>
        {branches.map(branch => (
          <option key={branch._id} value={branch._id}>
            {branch.name} {branch.isHeadOffice ? '(Head Office)' : ''}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
}
