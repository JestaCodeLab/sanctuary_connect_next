'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { PageHeader } from '@/components/dashboard';
import { Card, Button } from '@/components/ui';
import { eventsApi } from '@/lib/api';
import { getOccurrencesInRange, formatEventTime } from '@/lib/eventOccurrences';
import type { ChurchEvent } from '@/types';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const statusDotColor: Record<ChurchEvent['status'], string> = {
  scheduled: 'bg-blue-500',
  ongoing: 'bg-green-500',
  completed: 'bg-gray-400',
  cancelled: 'bg-red-400',
};

interface DayOccurrence {
  event: ChurchEvent;
  start: Date;
}

// UTC getters throughout this file (not local ones) so the calendar grid,
// "today", and event occurrence dots all line up on the same GMT calendar
// day for every viewer — a local getter would shift a day near midnight GMT
// depending on the viewer's own timezone offset.
function toDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function toDatetimeLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T09:00`;
}

export default function EventPlannerPage() {
  const router = useRouter();
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll(),
  });

  const { gridStart, gridEnd, weeks } = useMemo(() => {
    const monthStart = new Date(Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth(), 1));
    const start = new Date(monthStart);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 41);
    end.setUTCHours(23, 59, 59, 999);

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      days.push(d);
    }
    const weekRows: Date[][] = [];
    for (let i = 0; i < 42; i += 7) weekRows.push(days.slice(i, i + 7));

    return { gridStart: start, gridEnd: end, weeks: weekRows };
  }, [monthCursor]);

  const occurrencesByDay = useMemo(() => {
    const map = new Map<string, DayOccurrence[]>();

    const addOccurrence = (event: ChurchEvent, start: Date) => {
      const key = toDateKey(start);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ event, start });
    };

    for (const event of events) {
      if (event.isRecurring) {
        for (const occ of getOccurrencesInRange(event, gridStart, gridEnd)) {
          addOccurrence(event, occ.startDate);
        }
      } else {
        const start = new Date(event.startDate);
        if (start >= gridStart && start <= gridEnd) {
          addOccurrence(event, start);
        }
      }
    }

    for (const list of map.values()) {
      list.sort((a, b) => a.start.getTime() - b.start.getTime());
    }

    return map;
  }, [events, gridStart, gridEnd]);

  const today = new Date();
  const todayKey = toDateKey(today);

  return (
    <div>
      <PageHeader
        title="Planner"
        description="Schedule and view events on a calendar"
        actionLabel="New Event"
        actionIcon={Plus}
        onAction={() => router.push('/dashboard/events/new')}
      />

      <Card padding="none">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {monthCursor.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date();
                setMonthCursor(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
              }}
            >
              Today
            </Button>
            <button
              onClick={() => setMonthCursor(new Date(Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth() - 1, 1)))}
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMonthCursor(new Date(Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth() + 1, 1)))}
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-500">Loading calendar...</div>
        ) : (
          <div className="grid grid-cols-7">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                {label}
              </div>
            ))}

            {weeks.flat().map((day) => {
              const key = toDateKey(day);
              const inCurrentMonth = day.getUTCMonth() === monthCursor.getUTCMonth();
              const isToday = key === todayKey;
              const dayOccurrences = occurrencesByDay.get(key) || [];

              return (
                <div
                  key={key}
                  className={`min-h-[110px] p-1.5 border-b border-r border-gray-100 dark:border-gray-700 ${
                    inCurrentMonth ? '' : 'bg-gray-50/50 dark:bg-gray-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-primary text-white'
                          : inCurrentMonth
                          ? 'text-gray-700 dark:text-gray-300'
                          : 'text-gray-400 dark:text-gray-600'
                      }`}
                    >
                      {day.getUTCDate()}
                    </span>
                    <Link
                      href={`/dashboard/events/new?date=${encodeURIComponent(toDatetimeLocalInput(day))}`}
                      className="opacity-0 hover:opacity-100 focus:opacity-100 text-gray-400 hover:text-primary transition-opacity"
                      title="Schedule an event on this day"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="space-y-1">
                    {dayOccurrences.slice(0, 3).map(({ event, start }, idx) => (
                      <Link
                        key={`${event._id}-${idx}`}
                        href={`/dashboard/events/${event._id}`}
                        className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-primary/10 truncate"
                        title={event.title}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDotColor[event.status]}`} />
                        <span className="truncate text-gray-700 dark:text-gray-300">
                          {formatEventTime(start)} {event.title}
                        </span>
                      </Link>
                    ))}
                    {dayOccurrences.length > 3 && (
                      <p className="text-[10px] text-gray-400 px-1.5">+{dayOccurrences.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
