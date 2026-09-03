import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Branch } from '@/types';

interface BranchState {
  branches: Branch[];
  selectedBranchId: string | null; // null = "All Branches"
  hasUserSelected: boolean; // distinguishes "never chosen yet" from "explicitly chose All Branches"

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
      hasUserSelected: false,

      setBranches: (branches) => {
        const current = get();
        // Always land the user in a branch context rather than "All Branches"
        // by default - auto-select whenever there's at least one branch and
        // the user has never made an explicit choice yet (selectedBranchId
        // === null is ambiguous on its own - it also means "explicitly chose
        // All Branches" - hasUserSelected disambiguates). Prefer the head
        // office branch as the default when there's more than one; the user
        // can still explicitly switch to "All Branches" via the selector,
        // which sets hasUserSelected and is then respected below.
        if (branches.length > 0 && !current.hasUserSelected) {
          const defaultBranch = branches.find((b) => b.isHeadOffice) ?? branches[0];
          set({ branches, selectedBranchId: defaultBranch._id });
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
        set({ selectedBranchId: branchId, hasUserSelected: true });
      },

      reset: () => {
        set({ branches: [], selectedBranchId: null, hasUserSelected: false });
      },
    }),
    {
      name: 'branch-storage',
      skipHydration: true,
      partialize: (state) => ({
        selectedBranchId: state.selectedBranchId,
        hasUserSelected: state.hasUserSelected,
      }),
    }
  )
);

export default useBranchStore;
