'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cake, MessageSquare, Gift, Calendar } from 'lucide-react';
import { membersApi } from '@/lib/api';
import { Card } from '@/components/ui';
import PageHeader from '@/components/dashboard/PageHeader';
import FeatureGate from '@/components/dashboard/FeatureGate';
import type { MemberWithBirthday } from '@/types';

function BirthdayCard({ member }: { member: MemberWithBirthday }) {
  const dob = new Date(member.dateOfBirth!);
  const monthDay = dob.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <Card className="flex items-center gap-4 p-4">
      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-sm">
        {member.firstName[0]}{member.lastName[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {member.firstName} {member.lastName}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {monthDay} &middot; Turning {member.age}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {member.daysUntilBirthday > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            in {member.daysUntilBirthday}d
          </span>
        )}
        <button
          disabled
          title="Coming Soon"
          className="p-2 rounded-lg text-gray-400 cursor-not-allowed"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
}

function BirthdaysContent() {
  const [days, setDays] = useState<7 | 30>(7);

  const { data, isLoading } = useQuery({
    queryKey: ['birthdays', days],
    queryFn: () => membersApi.getBirthdays(days),
  });

  const todayBirthdays = data?.today ?? [];
  const upcomingBirthdays = data?.upcoming ?? [];

  return (
    <div>
      <PageHeader
        title="Birthdays"
        description="Track and celebrate member birthdays"
      />

      {/* Today's Birthdays */}
      {todayBirthdays.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Today&apos;s Birthdays
            </h2>
            <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
              {todayBirthdays.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayBirthdays.map((member) => (
              <Card key={member._id} className="flex items-center gap-4 p-4 border-primary/20 bg-primary/5">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {member.firstName[0]}{member.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-xs text-primary font-medium">
                    Turning {member.age} today!
                  </p>
                </div>
                <Cake className="w-5 h-5 text-primary" />
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Birthdays */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Upcoming Birthdays
            </h2>
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setDays(7)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                days === 7
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Next 7 Days
            </button>
            <button
              onClick={() => setDays(30)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                days === 30
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Next 30 Days
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : upcomingBirthdays.length === 0 && todayBirthdays.length === 0 ? (
          <Card className="text-center py-12">
            <Cake className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No birthdays in the next {days} days
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
              Make sure members have their date of birth set
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingBirthdays.map((member) => (
              <BirthdayCard key={member._id} member={member} />
            ))}
          </div>
        )}
      </div>

      {/* SMS Coming Soon Notice */}
      <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              SMS Birthday Greetings Coming Soon
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Automatic birthday SMS notifications will be available once an SMS provider is configured.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BirthdaysPage() {
  return (
    <FeatureGate featureKey="birthday_notifications" featureName="Birthday Notifications">
      <BirthdaysContent />
    </FeatureGate>
  );
}
