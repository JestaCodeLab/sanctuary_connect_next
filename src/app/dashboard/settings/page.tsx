'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Settings as SettingsIcon, Users, Shield, Zap } from 'lucide-react';
import GeneralTab from './_components/GeneralTab';
import UsersBranchesTab from './_components/UsersBranchesTab';
import CustomRolesTab from './_components/CustomRolesTab';
import SubscriptionTab from './_components/SubscriptionTab';

type Tab = 'general' | 'users' | 'roles' | 'subscription';

const tabs: { id: Tab; label: string; icon: typeof SettingsIcon }[] = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'users', label: 'Users & Branches', icon: Users },
  { id: 'roles', label: 'Custom Roles', icon: Shield },
  { id: 'subscription', label: 'Subscription', icon: Zap },
];

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: Tab = tabs.some(t => t.id === tabParam) ? (tabParam as Tab) : 'general';

  const setActiveTab = (tab: Tab) => {
    router.replace(`/dashboard/settings?tab=${tab}`, { scroll: false });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted mt-1">Manage your church, team, roles, and subscription</p>
      </div>

      {/* Top-level tabs - replaces the old Settings submenu in the sidebar */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-background'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'general' && <GeneralTab />}
      {activeTab === 'users' && <UsersBranchesTab />}
      {activeTab === 'roles' && <CustomRolesTab />}
      {activeTab === 'subscription' && <SubscriptionTab />}
    </div>
  );
}
