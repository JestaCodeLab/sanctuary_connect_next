'use client';

import { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, ArrowRightLeft } from 'lucide-react';
import { useBranchStore } from '@/store/branchStore';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui';
import Modal from './Modal';

export default function BranchSelector() {
  const { branches, selectedBranchId, selectBranch } = useBranchStore();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pendingBranchId, setPendingBranchId] = useState<string | null | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedBranch = branches.find(b => b._id === selectedBranchId);
  const label = selectedBranch ? selectedBranch.name : 'All Branches';

  const handleSelect = (branchId: string | null) => {
    // If already on this branch, just close the dropdown
    if (branchId === selectedBranchId) {
      setOpen(false);
      return;
    }
    // Show confirmation modal
    setPendingBranchId(branchId);
    setOpen(false);
  };

  const handleConfirmSwitch = () => {
    if (pendingBranchId === undefined) return;
    selectBranch(pendingBranchId);
    setPendingBranchId(undefined);
    // Invalidate all queries and reload the page to fetch branch-level data
    queryClient.clear();
    window.location.reload();
  };

  const handleCancelSwitch = () => {
    setPendingBranchId(undefined);
  };

  if (branches.length === 0) return null;

  const pendingBranch = pendingBranchId ? branches.find(b => b._id === pendingBranchId) : null;
  const pendingLabel = pendingBranchId === null ? 'All Branches' : pendingBranch?.name ?? '';
  const isEnteringBranch = pendingBranchId !== null && pendingBranchId !== undefined;

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border text-sm font-medium text-foreground hover:bg-background/80 transition-colors"
        >
          <Building2 className="w-4 h-4 text-muted" />
          <span className="max-w-[140px] truncate">{label}</span>
          <ChevronDown className={`w-4 h-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute left-0 mt-2 w-56 bg-card rounded-xl shadow-lg border border-border py-1 z-50 animate-fadeIn">
            <button
              onClick={() => handleSelect(null)}
              className="flex items-center gap-3 px-4 py-2 text-sm w-full text-left hover:bg-background transition-colors"
            >
              <Building2 className="w-4 h-4 text-muted" />
              <span className="flex-1">All Branches</span>
              {selectedBranchId === null && <Check className="w-4 h-4 text-primary" />}
            </button>
            <div className="border-t border-border my-1" />
            {branches.map(branch => (
              <button
                key={branch._id}
                onClick={() => handleSelect(branch._id)}
                className="flex items-center gap-3 px-4 py-2 text-sm w-full text-left hover:bg-background transition-colors"
              >
                <div className={`w-2 h-2 rounded-full ${branch.isHeadOffice ? 'bg-primary' : 'bg-muted'}`} />
                <span className="flex-1 truncate">{branch.name}</span>
                {selectedBranchId === branch._id && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Branch Switch Confirmation Modal */}
      <Modal
        isOpen={pendingBranchId !== undefined}
        onClose={handleCancelSwitch}
        title="Switch Branch"
        description={
          isEnteringBranch
            ? `You are about to switch to "${pendingLabel}". The page will reload to display only data from this branch.`
            : `You are switching back to "All Branches". The page will reload to display data across all branches.`
        }
        size="sm"
      >
        <div className="flex items-center gap-3 p-4 bg-background rounded-lg mb-6">
          <ArrowRightLeft className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="text-sm text-foreground">
            <span className="font-medium">{label}</span>
            <span className="text-muted mx-2">&rarr;</span>
            <span className="font-medium">{pendingLabel}</span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={handleCancelSwitch}>
            Cancel
          </Button>
          <Button onClick={handleConfirmSwitch}>
            Confirm Switch
          </Button>
        </div>
      </Modal>
    </>
  );
}
