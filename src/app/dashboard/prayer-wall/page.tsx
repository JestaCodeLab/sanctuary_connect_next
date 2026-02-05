'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { HandHeart, Heart, Plus, Info, CheckCircle } from 'lucide-react';
import { PageHeader, StatsGrid, Badge, EmptyState } from '@/components/dashboard';
import { Card, Button } from '@/components/ui';
import type { PrayerRequest } from '@/types';

type StatusFilter = 'all' | 'active' | 'answered';

const categoryBadgeVariant: Record<PrayerRequest['category'], 'error' | 'warning' | 'info' | 'success' | 'muted'> = {
  health: 'error',
  family: 'warning',
  financial: 'info',
  spiritual: 'success',
  other: 'muted',
};

const initialPrayers: PrayerRequest[] = [
  { _id: '1', title: 'Healing for Sister Mary', description: 'Please pray for Sister Mary who is recovering from surgery. She needs strength and comfort during this time.', category: 'health', status: 'active', isAnonymous: false, authorName: 'John D.', prayerCount: 24, createdAt: '2026-01-30' },
  { _id: '2', title: 'Guidance for Career Change', description: 'Seeking God\'s direction as I consider a major career transition. Pray for clarity and peace in this decision.', category: 'spiritual', status: 'active', isAnonymous: true, prayerCount: 18, createdAt: '2026-01-28' },
  { _id: '3', title: 'Family Restoration', description: 'Please pray for reconciliation and healing in my family. We are going through a difficult season.', category: 'family', status: 'active', isAnonymous: false, authorName: 'Sarah M.', prayerCount: 31, createdAt: '2026-01-25' },
  { _id: '4', title: 'Financial Breakthrough', description: 'Trusting God for provision during this challenging financial period. Pray for open doors and wisdom.', category: 'financial', status: 'active', isAnonymous: true, prayerCount: 15, createdAt: '2026-01-22' },
  { _id: '5', title: 'Safe Pregnancy', description: 'Thank God! Baby was born healthy last week. Prayers answered!', category: 'health', status: 'answered', isAnonymous: false, authorName: 'David K.', prayerCount: 45, createdAt: '2026-01-15' },
  { _id: '6', title: 'New Job Opportunity', description: 'God opened an amazing door! Got the job offer yesterday. Thank you all for your prayers!', category: 'financial', status: 'answered', isAnonymous: false, authorName: 'Grace O.', prayerCount: 28, createdAt: '2026-01-10' },
];

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return '1 week ago';
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 month ago';
  return `${diffMonths} months ago`;
}

export default function PrayerWallPage() {
  const [prayers, setPrayers] = useState<PrayerRequest[]>(initialPrayers);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [prayedSet, setPrayedSet] = useState<Set<string>>(new Set());

  // Computed stats
  const activeCount = prayers.filter((p) => p.status === 'active').length;
  const answeredCount = prayers.filter((p) => p.status === 'answered').length;
  const totalPrayersOffered = prayers.reduce((sum, p) => sum + p.prayerCount, 0);

  const stats = [
    { label: 'Active Requests', value: activeCount, icon: HandHeart },
    { label: 'Answered Prayers', value: answeredCount, icon: CheckCircle },
    { label: 'Total Prayers Offered', value: totalPrayersOffered, icon: Heart },
  ];

  // Client-side filtering
  const filteredPrayers = prayers.filter((prayer) => {
    if (statusFilter === 'all') return true;
    return prayer.status === statusFilter;
  });

  const filterButtons: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Answered', value: 'answered' },
  ];

  const handlePray = (prayerId: string) => {
    setPrayers((prev) =>
      prev.map((p) =>
        p._id === prayerId ? { ...p, prayerCount: p.prayerCount + 1 } : p
      )
    );
    setPrayedSet((prev) => {
      const next = new Set(prev);
      next.add(prayerId);
      return next;
    });
    toast.success('Prayer added');
  };

  return (
    <div>
      <PageHeader
        title="Prayer Wall"
        description="Share and support prayer requests"
        actionLabel="Submit Request"
        actionIcon={Plus}
        onAction={() => toast('Backend integration coming soon')}
      />

      {/* Info Banner */}
      <div className="flex items-center gap-3 bg-primary-light text-primary rounded-xl px-4 py-3 mb-6">
        <Info className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">
          Prayer wall backend is coming soon. The data shown below is for preview purposes.
        </p>
      </div>

      <StatsGrid stats={stats} />

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterButtons.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === filter.value
                ? 'bg-primary text-white'
                : 'bg-card text-muted hover:text-foreground hover:bg-background border border-border'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Prayer Request Cards */}
      {filteredPrayers.length === 0 ? (
        <EmptyState
          icon={HandHeart}
          title="No prayer requests"
          description="There are no prayer requests matching this filter. Try selecting a different filter or submit a new request."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrayers.map((prayer) => (
            <Card
              key={prayer._id}
              padding="md"
              className="hover:shadow-md transition-shadow"
            >
              {/* Top row: Category + Answered Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={categoryBadgeVariant[prayer.category]}>
                  {prayer.category.charAt(0).toUpperCase() + prayer.category.slice(1)}
                </Badge>
                {prayer.status === 'answered' && (
                  <Badge variant="success">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Answered
                    </span>
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h3 className="font-semibold text-foreground mt-3">
                {prayer.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-muted mt-2 line-clamp-3">
                {prayer.description}
              </p>

              {/* Author */}
              <p className="text-xs text-muted-foreground mt-3">
                {prayer.isAnonymous ? 'Anonymous' : prayer.authorName}
              </p>

              {/* Bottom row */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <div className="flex items-center gap-1.5 text-sm text-muted">
                  <Heart
                    className="w-4 h-4"
                    fill={prayedSet.has(prayer._id) ? 'currentColor' : 'none'}
                  />
                  <span>{prayer.prayerCount} prayers</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePray(prayer._id)}
                >
                  Pray
                </Button>
              </div>

              {/* Time ago */}
              <p className="text-xs text-muted-foreground mt-2">
                {getTimeAgo(prayer.createdAt)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
