import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Organization } from '@/types';

interface OrganizationState {
  organization: Organization | null;
  currency: string;
  logoUrl: string | null;

  // Actions
  setOrganization: (organization: Organization) => void;
  setCurrency: (currency: string) => void;
  setLogoUrl: (logoUrl: string) => void;
  clearOrganization: () => void;
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set) => ({
      organization: null,
      currency: 'GHS',
      logoUrl: null,

      setOrganization: (organization) => {
        set({
          organization,
          currency: organization.currency || 'GHS',
          logoUrl: organization.logoUrl || null,
        });
      },

      setCurrency: (currency) => {
        set({ currency });
      },

      setLogoUrl: (logoUrl) => {
        set({ logoUrl });
      },

      clearOrganization: () => {
        set({
          organization: null,
          currency: 'GHS',
          logoUrl: null,
        });
      },
    }),
    {
      name: 'organization-storage',
      skipHydration: true,
    }
  )
);
