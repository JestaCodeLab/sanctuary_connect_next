import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Branch, FundBucket, Organization, OnboardingState, SubscriptionState } from '@/types';

interface RestoreData {
  organization: Organization;
  branches: Branch[];
  fundBuckets: FundBucket[];
}

interface OnboardingStore extends OnboardingState {
  // Actions
  setStep: (step: number) => void;
  setIdentity: (identity: Partial<OnboardingState['identity']>) => void;
  setBranches: (branches: Branch[]) => void;
  addBranch: (branch: Branch) => void;
  setFinances: (finances: Partial<OnboardingState['finances']>) => void;
  setSubscription: (subscription: Partial<SubscriptionState>) => void;
  setOrganizationId: (id: string) => void;
  restoreFromBackend: (data: RestoreData) => void;
  reset: () => void;
}

const initialState: OnboardingState = {
  currentStep: 1,
  identity: {
    churchName: '',
    legalName: '',
    logoUrl: null,
    structure: 'single',
  },
  branches: [],
  finances: {
    paymentGateway: null,
    fundBuckets: [],
  },
  subscription: {
    plan: null,
    billingCycle: 'monthly',
    paymentMethod: null,
  },
  organizationId: null,
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      ...initialState,

      setStep: (step) => {
        set({ currentStep: step });
      },

      setIdentity: (identity) => {
        set((state) => ({
          identity: { ...state.identity, ...identity },
        }));
      },

      setBranches: (branches) => {
        set({ branches });
      },

      addBranch: (branch) => {
        set((state) => ({
          branches: [...state.branches, branch],
        }));
      },

      setFinances: (finances) => {
        set((state) => ({
          finances: { ...state.finances, ...finances },
        }));
      },

      setSubscription: (subscription) => {
        set((state) => ({
          subscription: { ...state.subscription, ...subscription },
        }));
      },

      setOrganizationId: (id) => {
        set({ organizationId: id });
      },

      restoreFromBackend: (data) => {
        const { organization, branches, fundBuckets } = data;
        set({
          organizationId: organization._id,
          currentStep: organization.onboardingStep || 1,
          identity: {
            churchName: organization.churchName,
            legalName: organization.legalName || '',
            logoUrl: organization.logoUrl || null,
            structure: organization.structure,
          },
          branches: branches,
          finances: {
            paymentGateway: organization.paymentGateway || null,
            fundBuckets: fundBuckets.map(fb => fb.name),
          },
        });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'onboarding-storage',
    }
  )
);

export default useOnboardingStore;
