import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Branch } from '@/types';

interface BranchState {
  branches: Branch[];
  selectedBranchId: string | null; // null = "All Branches"

  // Actions
  setBranches: (branches: Branch[]) => void;
  selectBranch: (branchId: string | null) => void;
  reset: () => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set, get) => ({
      branches: [],
      selectedBranchId: null,

      setBranches: (branches) => {
        const current = get();
        // Auto-select if only one branch and nothing selected
        if (branches.length === 1 && !current.selectedBranchId) {
          set({ branches, selectedBranchId: branches[0]._id });
        } else {
          // Validate current selection still exists
          const stillValid = current.selectedBranchId &&
            branches.some(b => b._id === current.selectedBranchId);
          set({
            branches,
            selectedBranchId: stillValid ? current.selectedBranchId : null,
          });
        }
      },

      selectBranch: (branchId) => {
        set({ selectedBranchId: branchId });
      },

      reset: () => {
        set({ branches: [], selectedBranchId: null });
      },
    }),
    {
      name: 'branch-storage',
      partialize: (state) => ({
        selectedBranchId: state.selectedBranchId,
      }),
    }
  )
);

export default useBranchStore;
