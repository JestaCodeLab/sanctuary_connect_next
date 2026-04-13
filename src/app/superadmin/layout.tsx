'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  MessageSquare,
  ScrollText,
  Package,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Shield,
  GitBranch,
  Network,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const navLinks = [
  { label: 'Dashboard', href: '/superadmin/dashboard', icon: LayoutDashboard },
  { label: 'Organizations', href: '/superadmin/organizations', icon: Building2 },
  { label: 'Branches', href: '/superadmin/branches', icon: GitBranch },
  { label: 'Departments', href: '/superadmin/departments', icon: Network },
  { label: 'Members', href: '/superadmin/members', icon: Users },
  { label: 'Subscriptions', href: '/superadmin/subscriptions', icon: CreditCard },
  { label: 'SMS Credits', href: '/superadmin/sms-credits', icon: MessageSquare },
  { label: 'SMS Packages', href: '/superadmin/sms-packages', icon: Package },
  { label: 'Audit Log', href: '/superadmin/audit-log', icon: ScrollText },
];

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout, checkTokenExpiration } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Check authentication and role
  useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    
    // Only check token expiration if authenticated
    const expired = checkTokenExpiration();
    if (expired) {
      router.replace('/login');
      return;
    }
    
    if (user?.role !== 'superadmin') {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, user?.role, router, checkTokenExpiration]);

  // Periodic token expiration check (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const expired = checkTokenExpiration();
      if (expired) {
        router.replace('/login');
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [checkTokenExpiration, router]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (isLoading || !isAuthenticated || user?.role !== 'superadmin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar/20 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="text-sm font-semibold text-sidebar-foreground">Back Office</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-sidebar-foreground/70 hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground'
                }`}
              >
                <link.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-sidebar-foreground/60">Superadmin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-muted hover:bg-background"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-muted-foreground">
              Sanctuary Connect — Superadmin
            </span>
          </div>

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-background transition-colors"
            >
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <span className="text-sm font-medium text-foreground hidden md:block">
                {user?.firstName}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-card rounded-xl shadow-lg border border-border py-2 z-50">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-medium text-foreground">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-muted truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-error hover:bg-background w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
