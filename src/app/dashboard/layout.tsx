'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  MessageSquare,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  Building2,
  ClipboardCheck,
  HandHeart,
  Cake,
  CalendarPlus,
  PieChart,
  TrendingUp,
  TrendingDown,
  FileText,
  Network,
  LucideIcon,
} from 'lucide-react';
import { Logo, ThemeToggle } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import { organizationApi, userBranchApi } from '@/lib/api';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import BranchSelector from '@/components/dashboard/BranchSelector';

interface SidebarChild {
  label: string;
  href: string;
  icon?: LucideIcon;
  featureKey?: string;
}

interface SidebarLink {
  label: string;
  href: string;
  icon: LucideIcon;
  featureKey?: string;
  children?: SidebarChild[];
  hideWhenBranchSelected?: boolean;
}

const sidebarLinks: SidebarLink[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Branches', href: '/dashboard/branches', icon: Building2, hideWhenBranchSelected: true },
  { label: 'Departments', href: '/dashboard/departments', icon: Network, featureKey: 'department_management' },
  {
    label: 'Members',
    href: '/dashboard/members',
    icon: Users,
    children: [
      { label: 'All Members', href: '/dashboard/members' },
      { label: 'Birthdays', href: '/dashboard/members/birthdays', icon: Cake, featureKey: 'birthday_notifications' },
    ],
  },
  {
    label: 'Events',
    href: '/dashboard/events',
    icon: Calendar,
    children: [
      { label: 'All Events', href: '/dashboard/events' },
      { label: 'New Event', href: '/dashboard/events/new', icon: CalendarPlus },
    ],
  },
  { label: 'Attendance', href: '/dashboard/attendance', icon: ClipboardCheck },
  {
    label: 'Finance',
    href: '/dashboard/finance',
    icon: DollarSign,
    children: [
      { label: 'Overview', href: '/dashboard/finance', icon: PieChart },
      { label: 'Income', href: '/dashboard/finance/income', icon: TrendingUp },
      { label: 'Expenses', href: '/dashboard/finance/expenses', icon: TrendingDown },
      { label: 'Reports', href: '/dashboard/finance/reports', icon: FileText, featureKey: 'advanced_financial_reporting' },
    ],
  },
  { label: 'Communication', href: '/dashboard/communication', icon: MessageSquare },
  { label: 'Prayer Wall', href: '/dashboard/prayer-wall', icon: HandHeart },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    children: [
      { label: 'General', href: '/dashboard/settings' },
      { label: 'Users & Branches', href: '/dashboard/settings/users', icon: Users },
    ],
  },
];

const onboardingStepRoutes: Record<number, string> = {
  1: '/onboarding/identity',
  2: '/onboarding/branches',
  3: '/onboarding/finances',
  4: '/onboarding/subscription',
  5: '/onboarding/review',
};

function SidebarItem({
  link,
  pathname,
  hasFeature,
  featureLoading,
  onNavigate,
}: {
  link: SidebarLink;
  pathname: string;
  hasFeature: (key: string) => boolean;
  featureLoading: boolean;
  onNavigate: () => void;
}) {
  const isParentActive = link.href === '/dashboard'
    ? pathname === '/dashboard'
    : pathname.startsWith(link.href);

  const [isExpanded, setIsExpanded] = useState(isParentActive);

  // Auto-expand when navigating to a child route
  useEffect(() => {
    if (isParentActive && link.children) {
      setIsExpanded(true);
    }
  }, [isParentActive, link.children]);

  // If the item itself is feature-gated and the feature is not available, hide it
  if (link.featureKey && !featureLoading && !hasFeature(link.featureKey)) {
    return null;
  }

  // If no children, render simple link
  if (!link.children) {
    return (
      <Link
        href={link.href}
        onClick={onNavigate}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isParentActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted hover:bg-background hover:text-foreground'
        }`}
      >
        <link.icon className={`w-5 h-5 ${isParentActive ? 'text-primary' : ''}`} />
        {link.label}
      </Link>
    );
  }

  // Filter children by feature access
  const visibleChildren = link.children.filter(child => {
    if (!child.featureKey) return true;
    if (featureLoading) return true;
    return hasFeature(child.featureKey);
  });

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full ${
          isParentActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted hover:bg-background hover:text-foreground'
        }`}
      >
        <link.icon className={`w-5 h-5 ${isParentActive ? 'text-primary' : ''}`} />
        <span className="flex-1 text-left">{link.label}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
          {visibleChildren.map((child) => {
            const isChildActive = child.href === link.href
              ? pathname === child.href
              : pathname.startsWith(child.href) && pathname !== link.href;
            // Special case: "All Members" / "All Events" / "Overview" exact match
            const isExactMatch = pathname === child.href;
            const active = child.href === link.href ? isExactMatch : isChildActive;

            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'text-primary font-medium'
                    : 'text-muted hover:text-foreground hover:bg-background'
                }`}
              >
                {child.icon && <child.icon className={`w-4 h-4 ${active ? 'text-primary' : ''}`} />}
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const { selectedBranchId, setBranches } = useBranchStore();
  const { hasFeature, isLoading: featureLoading } = useFeatureAccess();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Check if user has completed onboarding and load branches
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!isAuthenticated || isLoading) return;

      try {
        const orgData = await organizationApi.getMyOrganization();

        if (!orgData.organization.onboardingComplete) {
          // Redirect to appropriate onboarding step
          const step = orgData.organization.onboardingStep || 1;
          const route = onboardingStepRoutes[step] || '/onboarding/identity';
          router.push(route);
        } else {
          setCheckingOnboarding(false);

          // Load branches based on role
          if (user?.role === 'admin') {
            // Admin gets all org branches
            setBranches(orgData.branches);
          } else {
            // Non-admin gets only assigned branches
            try {
              const myBranches = await userBranchApi.getMyBranches();
              setBranches(myBranches);
            } catch {
              setBranches([]);
            }
          }
        }
      } catch (error) {
        // No organization found - redirect to start onboarding
        if (user?.role === 'member') {
          router.push('/onboarding/identity');
        } else {
          setCheckingOnboarding(false);
        }
      }
    };

    checkOnboarding();
  }, [isAuthenticated, isLoading, user, router, setBranches]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
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

  if (isLoading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <Logo size="sm" />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-muted hover:bg-background"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {sidebarLinks
            .filter((link) => !(link.hideWhenBranchSelected && selectedBranchId))
            .map((link) => (
            <SidebarItem
              key={link.label}
              link={link}
              pathname={pathname}
              hasFeature={hasFeature}
              featureLoading={featureLoading}
              onNavigate={() => setSidebarOpen(false)}
            />
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted truncate">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          {/* Left: Mobile menu + Search */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-muted hover:bg-background hover:text-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-background rounded-lg px-3 py-2 w-64">
              <Search className="w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <BranchSelector />
            <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
            <ThemeToggle />
            <button className="p-2 rounded-lg text-muted hover:bg-background hover:text-foreground relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full"></span>
            </button>
            <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

            {/* Profile Dropdown */}
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
                <div className="absolute right-0 mt-2 w-56 bg-card rounded-xl shadow-lg border border-border py-2 z-50 animate-fadeIn">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-medium text-foreground">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-muted truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-background"
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-background"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                  </div>
                  <div className="border-t border-border pt-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-error hover:bg-background w-full text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
