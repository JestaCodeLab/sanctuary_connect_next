'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import ThemeProvider from './ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';

interface ProvidersProps {
  children: React.ReactNode;
}

// Component to hydrate auth store on mount
function AuthInitializer() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Rehydrate the auth store, and the branch store too - it also uses
    // skipHydration, and dashboard/layout.tsx's setBranches() runs before this
    // effect otherwise, sees an un-rehydrated (default-null) selectedBranchId,
    // decides the real persisted selection is "stale", and overwrites it back
    // to null - silently undoing any branch switch on every page reload.
    useAuthStore.persist.rehydrate();
    useBranchStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  // Don't render children until hydrated to prevent flash
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return null;
}

export default function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthInitializer />
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            className: '',
            style: {
              background: 'var(--card)',
              color: 'var(--card-foreground)',
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              border: '1px solid var(--border)',
            },
            success: {
              iconTheme: {
                primary: 'var(--success)',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: 'var(--error)',
                secondary: '#fff',
              },
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
