import { ThemeToggle } from '@/components/ui';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-gray-900">
      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/sanctuary_app_logo.png" alt="Sanctuary Connect" className="h-9 w-auto" />
            <span className="font-semibold text-gray-600 dark:text-gray-300 text-xl">Sanctuary Connect</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">
          &copy; {new Date().getFullYear()} Sanctuary Connect. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
