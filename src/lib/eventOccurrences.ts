import type { ChurchEvent } from '@/types';

export interface RecurrenceOccurrence {
  startDate: Date;
  endDate: Date;
}

/**
 * If `event` is currently happening (including a recurring event's current
 * occurrence), returns its start/end window. Otherwise returns null.
 */
export function getCurrentOccurrenceForEvent(event: ChurchEvent, now: Date = new Date()): RecurrenceOccurrence | null {
  if (!event.isRecurring || !event.recurrencePattern) return null;

  const anchorStart = new Date(event.startDate);
  const duration = new Date(event.endDate).getTime() - anchorStart.getTime();
  const seriesEnd = event.recurrenceEndDate ? new Date(event.recurrenceEndDate) : null;

  const current = new Date(anchorStart);
  if (event.recurrenceDay !== undefined && event.recurrenceDay !== null) {
    while (current.getDay() !== event.recurrenceDay) {
      current.setDate(current.getDate() + 1);
    }
    current.setHours(anchorStart.getHours(), anchorStart.getMinutes(), anchorStart.getSeconds(), anchorStart.getMilliseconds());
  }

  const increment = event.recurrencePattern === 'weekly' ? 7 : event.recurrencePattern === 'biweekly' ? 14 : 30;

  // Fast-forward to the time period around now
  while (current < now) {
    const occEnd = new Date(current.getTime() + duration);
    if (occEnd >= now) {
      break;
    }
    // Advance date
    if (event.recurrencePattern === 'monthly') {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setDate(current.getDate() + increment);
    }
  }

  if (seriesEnd && current > seriesEnd) return null;

  const occStart = new Date(current);
  const occEnd = new Date(occStart.getTime() + duration);

  // Check if we're within this occurrence's time window
  if (now >= occStart && now <= occEnd) {
    return { startDate: occStart, endDate: occEnd };
  }

  return null;
}

/**
 * Every occurrence of a (possibly recurring) event that falls within
 * [rangeStart, rangeEnd]. Used by the events Planner calendar to render each
 * day's cell without duplicating the recurrence math per page.
 */
export function getOccurrencesInRange(event: ChurchEvent, rangeStart: Date, rangeEnd: Date): RecurrenceOccurrence[] {
  if (!event.isRecurring || !event.recurrencePattern) return [];

  const anchorStart = new Date(event.startDate);
  const duration = new Date(event.endDate).getTime() - anchorStart.getTime();
  const seriesEnd = event.recurrenceEndDate ? new Date(event.recurrenceEndDate) : null;
  const from = new Date(rangeStart);
  const to = new Date(rangeEnd);

  const occurrences: RecurrenceOccurrence[] = [];

  const current = new Date(anchorStart);
  if (event.recurrenceDay !== undefined && event.recurrenceDay !== null) {
    while (current.getDay() !== event.recurrenceDay) {
      current.setDate(current.getDate() + 1);
    }
    current.setHours(anchorStart.getHours(), anchorStart.getMinutes(), anchorStart.getSeconds(), anchorStart.getMilliseconds());
  }

  const increment = event.recurrencePattern === 'weekly' ? 7 : event.recurrencePattern === 'biweekly' ? 14 : 30;

  while (current <= to) {
    if (seriesEnd && current > seriesEnd) break;

    if (current >= from) {
      const occStart = new Date(current);
      const occEnd = new Date(occStart.getTime() + duration);
      occurrences.push({ startDate: occStart, endDate: occEnd });
    }

    // Advance date
    if (event.recurrencePattern === 'monthly') {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setDate(current.getDate() + increment);
    }
  }

  return occurrences;
}
