'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import ThemeProvider from './ThemeProvider';
import { useAuthStore } from '@/store/authStore';

interface ProvidersProps {
  children: React.ReactNode;
}

// Component to hydrate auth store on mount
function AuthInitializer() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Rehydrate the auth store
    useAuthStore.persist.rehydrate();
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
