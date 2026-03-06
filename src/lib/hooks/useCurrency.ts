import { useOrganizationStore } from '@/store/organizationStore';

export function useCurrency() {
  const currency = useOrganizationStore((state) => state.currency);

  const formatCurrency = (amount: number): string => {
    return `${currency} ${amount.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const getCurrencySymbol = (): string => {
    const symbols: Record<string, string> = {
      GHS: '₵',
      USD: '$',
      GBP: '£',
      EUR: '€',
      NGN: '₦',
    };
    return symbols[currency] || currency;
  };

  return {
    currency,
    formatCurrency,
    getCurrencySymbol,
  };
}
