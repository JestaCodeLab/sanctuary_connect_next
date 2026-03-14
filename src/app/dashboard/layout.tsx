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
  Cake,
  CalendarPlus,
  PieChart,
  TrendingUp,
  TrendingDown,
  FileText,
  Network,
  LucideIcon,
  BarChart3,
  Send,
  Mail,
  Phone,
  Zap,
  ArrowLeftRight,
} from 'lucide-react';
import { Logo, ThemeToggle } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import { useOrganizationStore } from '@/store/organizationStore';
import { organizationApi, userBranchApi } from '@/lib/api';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import BranchSelector from '@/components/dashboard/BranchSelector';
import SubscriptionUsage from '@/components/dashboard/SubscriptionUsage';

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
  { label: 'Branches', href: '/dashboard/branches', icon: Building2, hideWhenBranchSelected: true, featureKey: 'branches' },
  { label: 'Departments', href: '/dashboard/departments', icon: Network, featureKey: 'department_management' },
  {
    label: 'Members',
    href: '/dashboard/members',
    icon: Users,
    featureKey: 'member_directory',
    children: [
      { label: 'All Members', href: '/dashboard/members' },
      { label: 'Birthdays', href: '/dashboard/members/birthdays', icon: Cake, featureKey: 'birthday_notifications' },
    ],
  },
  {
    label: 'Events',
    href: '/dashboard/events',
    icon: Calendar,
    featureKey: 'event_management',
    children: [
      { label: 'All Events', href: '/dashboard/events' },
      { label: 'New Event', href: '/dashboard/events/new', icon: CalendarPlus },
    ],
  },
  { label: 'Attendance', href: '/dashboard/attendance', icon: ClipboardCheck, featureKey: 'attendance_tracking' },
  {
    label: 'Finance',
    href: '/dashboard/finance',
    icon: DollarSign,
    featureKey: 'financial_reporting',
    children: [
      { label: 'Overview', href: '/dashboard/finance', icon: PieChart },
      { label: 'Income', href: '/dashboard/finance/income', icon: TrendingUp },
      { label: 'Expenses', href: '/dashboard/finance/expenses', icon: TrendingDown },
      { label: 'Reports', href: '/dashboard/finance/reports', icon: FileText, featureKey: 'advanced_financial_reporting' },
      { label: 'Transactions', href: '/dashboard/finance/transactions', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Communication',
    href: '/dashboard/communication',
    icon: MessageSquare,
    featureKey: 'sms_credits',
    children: [
      { label: 'Analytics', href: '/dashboard/communication/analytics', icon: BarChart3, featureKey: 'advanced_analytics' },
      { label: 'Send SMS', href: '/dashboard/communication/send-sms', icon: Send },
      { label: 'Templates', href: '/dashboard/communication/templates', icon: Mail },
    ],
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    children: [
      { label: 'General', href: '/dashboard/settings' },
      { label: 'Users & Branches', href: '/dashboard/settings/users', icon: Users },
      { label: 'Subscription', href: '/dashboard/settings/subscription', icon: Zap },
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
            ? 'bg-primary/20 text-primary'
            : 'text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground'
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
            ? 'bg-primary/20 text-primary'
            : 'text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground'
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
        <div className="ml-4 mt-1 space-y-0.5 border-l border-white/20 pl-3">
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
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/10'
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
  const { setOrganization, logoUrl, organization } = useOrganizationStore();
  const { hasFeature, isLoading: featureLoading } = useFeatureAccess();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If store is still loading (rehydrating), don't do anything
    if (isLoading) {
      console.log('[Dashboard] Auth check: still loading');
      return;
    }
    
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      const msg = `[Dashboard] Auth check: NOT authenticated, redirecting to login. hasCheckedOnboarding=${hasCheckedOnboarding}`;
      console.log(msg);
      sessionStorage.setItem('lastDashboardLog', msg);
      sessionStorage.setItem('authCheckTriggeredRedirect', 'true');
      router.push('/login');
      return;
    }

    const msg = `[Dashboard] Auth check: PASSED, authenticated. hasCheckedOnboarding=${hasCheckedOnboarding}`;
    console.log(msg);
    sessionStorage.setItem('lastDashboardLog', msg);
  }, [isAuthenticated, isLoading, router]);

  // Check if user has completed onboarding and load branches
  useEffect(() => {
    // Prevent running multiple times
    if (hasCheckedOnboarding) {
      const msg = `[Dashboard] Already checked onboarding, skipping...`;
      console.log(msg);
      return;
    }

    const msg0 = `[Dashboard] checkOnboarding effect STARTED`;
    console.log(msg0);
    sessionStorage.setItem('lastDashboardLog', msg0);

    const checkOnboarding = async () => {
      if (!isAuthenticated || isLoading) {
        const msg = `[Dashboard] Early return: isAuthenticated=${isAuthenticated}, isLoading=${isLoading}`;
        console.log(msg);
        sessionStorage.setItem('lastDashboardLog', msg);
        return;
      }

      const msg1 = `[Dashboard] Checking onboarding... isAuthenticated=${isAuthenticated}, isLoading=${isLoading}`;
      console.log(msg1);
      sessionStorage.setItem('lastDashboardLog', msg1);

      try {
        sessionStorage.setItem('orgApiPhase', 'calling');
        const orgData = await organizationApi.getMyOrganization();
        sessionStorage.setItem('orgApiPhase', 'success');
        
        const msg2 = `[Dashboard] Got org data: onboardingComplete=${orgData.organization.onboardingComplete}`;
        console.log(msg2);
        sessionStorage.setItem('lastDashboardLog', msg2);

        if (!orgData.organization.onboardingComplete) {
          // Redirect to appropriate onboarding step
          const step = orgData.organization.onboardingStep || 1;
          const route = onboardingStepRoutes[step] || '/onboarding/identity';
          sessionStorage.setItem('lastDashboardLog', `[Dashboard] Onboarding incomplete, redirecting to ${route}`);
          router.push(route);
        } else {
          const msg3 = `[Dashboard] Setting organization and checking onboarding...`;
          console.log(msg3);
          sessionStorage.setItem('lastDashboardLog', msg3);

          console.log('[Dashboard] Calling setCheckingOnboarding(false)');
          setCheckingOnboarding(false);
          sessionStorage.setItem('lastDashboardLog', `[Dashboard] setCheckingOnboarding(false) called`);

          console.log('[Dashboard] Calling setOrganization');
          setOrganization(orgData.organization);
          sessionStorage.setItem('lastDashboardLog', `[Dashboard] setOrganization called`);

          // Load branches based on role
          if (user?.role === 'admin') {
            const msg = `[Dashboard] User is admin, loading ${orgData.branches?.length || 0} branches from org`;
            console.log(msg);
            sessionStorage.setItem('lastDashboardLog', msg);
            console.log('[Dashboard] Calling setBranches');
            setBranches(orgData.branches);
            const msg4 = `[Dashboard] setBranches called with admin branches`;
            console.log(msg4);
            sessionStorage.setItem('lastDashboardLog', msg4);
          } else {
            const msg = `[Dashboard] User is ${user?.role}, calling getMyBranches()`;
            console.log(msg);
            sessionStorage.setItem('lastDashboardLog', msg);
            // Non-admin gets only assigned branches
            try {
              sessionStorage.setItem('branchesApiPhase', 'calling');
              const myBranches = await userBranchApi.getMyBranches();
              sessionStorage.setItem('branchesApiPhase', 'success');
              const msg2 = `[Dashboard] Got ${myBranches?.length || 0} branches from getMyBranches()`;
              console.log(msg2);
              sessionStorage.setItem('lastDashboardLog', msg2);
              console.log('[Dashboard] Calling setBranches');
              setBranches(myBranches);
              sessionStorage.setItem('lastDashboardLog', `[Dashboard] setBranches called with ${myBranches?.length || 0} branches`);
            } catch (branchError: any) {
              const msg2 = `[Dashboard] ERROR in getMyBranches(): ${branchError?.response?.status} - ${branchError?.message}`;
              console.error(msg2);
              sessionStorage.setItem('lastDashboardLog', msg2);
              sessionStorage.setItem('branchesApiPhase', `error-${branchError?.response?.status}`);
              setBranches([]);
            }
          }

          // Mark that we've checked onboarding
          console.log('[Dashboard] Calling setHasCheckedOnboarding(true)');
          setHasCheckedOnboarding(true);
          sessionStorage.setItem('lastDashboardLog', `[Dashboard] setHasCheckedOnboarding(true) called`);
          
          const msgEnd = `[Dashboard] checkOnboarding effect ENDED - dashboard ready`;
          console.log(msgEnd);
          sessionStorage.setItem('lastDashboardLog', msgEnd);
          sessionStorage.setItem('checkOnboardingStatus', 'complete');
        }
      } catch (error: any) {
        const msg3 = `[Dashboard] Error in checkOnboarding: status=${error?.response?.status}, message=${error?.message}`;
        console.error(msg3);
        sessionStorage.setItem('lastDashboardLog', msg3);
        sessionStorage.setItem('orgApiPhase', `error-${error?.response?.status}`);
        // No organization found - redirect to start onboarding
        if (user?.role === 'member') {
          sessionStorage.setItem('lastDashboardLog', `[Dashboard] Member with no org, redirecting to onboarding`);
          router.push('/onboarding/identity');
        } else {
          setCheckingOnboarding(false);
        }
      }
    };

    checkOnboarding();
  }, [isAuthenticated, isLoading, user?.role, hasCheckedOnboarding]);

  useEffect(() => {
    // Monitor for auth changes
    console.log('[Dashboard] Auth state updated:', {
      isAuthenticated,
      isLoading,
      hasCheckedOnboarding,
      userEmail: user?.email,
      userRole: user?.role,
    });
    sessionStorage.setItem('authStateLog', JSON.stringify({
      isAuthenticated,
      isLoading,
      hasCheckedOnboarding,
      userEmail: user?.email,
      userRole: user?.role,
      timestamp: new Date().toISOString(),
    }));
  }, [isAuthenticated, isLoading, hasCheckedOnboarding, user?.email, user?.role]);

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
    const msg = `[Dashboard] RENDER: Not authenticated after checks! Redirecting...`;
    console.error(msg);
    sessionStorage.setItem('lastDashboardLog', msg);
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
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar/20 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          {logoUrl ? (
            <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
              <img
                src={logoUrl}
                alt={organization?.churchName || 'Church logo'}
                className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
              />
              <span className="text-sm font-semibold text-sidebar-foreground truncate">
                {organization?.churchName || 'Dashboard'}
              </span>
            </Link>
          ) : (
            <Logo size="sm" />
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-sidebar-foreground/70 hover:bg-white/10"
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
        <div className="p-4 border-t border-white/10 space-y-3">
          <SubscriptionUsage />
          <div className="pt-3"></div>
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user?.role}</p>
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
