import type { ChurchEvent } from '@/types';

export interface RecurrenceOccurrence {
  startDate: Date;
  endDate: Date;
}

/** Splits a `datetime-local` string ("YYYY-MM-DDTHH:MM") into its date and time parts. */
export function splitDateTimeLocal(value?: string): { date: string; time: string } {
  if (!value) return { date: '', time: '' };
  const [date = '', time = ''] = value.split('T');
  return { date, time };
}

/** Combines a date ("YYYY-MM-DD") and time ("HH:MM") into a `datetime-local` string. */
export function combineDateAndTime(date: string, time: string): string {
  if (!date || !time) return '';
  return `${date}T${time}`;
}

/**
 * Converts a naive `datetime-local` string ("YYYY-MM-DDTHH:MM", no offset) —
 * understood as already being expressed in the fixed event timezone (UTC,
 * see EVENT_TIME_ZONE below) — into an explicit ISO instant string. Sending
 * this instead of the raw naive string to the API removes any dependency on
 * the browser's or server's ambient timezone to interpret it correctly;
 * without it, the same typed "9:00 PM" could be stored as a different UTC
 * instant depending on what machine happens to process the request.
 */
export function toEventISOString(value?: string): string {
  if (!value) return '';
  const withOffset = /Z$|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
  const d = new Date(withOffset);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

// Ghana runs a fixed UTC+0 (GMT) offset with no DST, and event times are
// entered as that wall-clock time. Every event date/time display pins to
// this zone explicitly so it reads identically for every viewer regardless
// of their own browser's local timezone — a viewer in another timezone must
// see the same time the organizer entered, not their own local conversion.
const EVENT_TIME_ZONE = 'UTC';

function toDate(input: string | Date): Date {
  return typeof input === 'string' ? new Date(input) : input;
}

/** Formats a date as "MMM D, YYYY", pinned to the event timezone. */
export function formatEventDate(input: string | Date, opts: Intl.DateTimeFormatOptions = {}): string {
  return toDate(input).toLocaleDateString('en-US', {
    timeZone: EVENT_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...opts,
  });
}

/** Formats a time as "h:mm AM/PM", pinned to the event timezone. */
export function formatEventTime(input: string | Date, opts: Intl.DateTimeFormatOptions = {}): string {
  return toDate(input).toLocaleTimeString('en-US', {
    timeZone: EVENT_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    ...opts,
  });
}

/** Formats a combined date + time, pinned to the event timezone. */
export function formatEventDateTime(input: string | Date, opts: Intl.DateTimeFormatOptions = {}): string {
  return toDate(input).toLocaleString('en-US', {
    timeZone: EVENT_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...opts,
  });
}

/** Whether two instants fall on the same calendar day in the event timezone. */
export function isSameEventDay(a: string | Date, b: string | Date): boolean {
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { timeZone: EVENT_TIME_ZONE });
  return fmt(toDate(a)) === fmt(toDate(b));
}

/** "Today" / "Tomorrow" / short weekday-date, all evaluated in the event timezone. */
export function formatRelativeEventDate(input: string | Date): string {
  const date = toDate(input);
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  if (isSameEventDay(date, now)) return 'Today';
  if (isSameEventDay(date, tomorrow)) return 'Tomorrow';

  return date.toLocaleDateString('en-US', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

const RECURRENCE_PATTERN_LABELS: Record<string, string> = {
  weekly: 'weekly',
  biweekly: 'bi-weekly',
  monthly: 'monthly',
};

const DAY_OF_WEEK_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface RecurrenceSummaryInput {
  startDate?: string;
  endDate?: string;
  recurrencePattern?: string;
  recurrenceDay?: string | number;
  recurrenceEndDate?: string;
}

/**
 * Human-readable one-line summary of a recurring event's series, e.g.
 * "Repeats weekly on Sundays, 7:00 AM–9:30 AM, starting Aug 16, 2026 through
 * Dec 20, 2026". The Start/End Date fields on the recurrence form only ever
 * capture the first occurrence, so this exists to make the actual series
 * boundaries legible without mentally reassembling them from separate fields.
 */
export function formatRecurrenceSummary(input: RecurrenceSummaryInput): string {
  const { startDate, endDate, recurrencePattern, recurrenceDay, recurrenceEndDate } = input;

  const patternLabel = recurrencePattern ? RECURRENCE_PATTERN_LABELS[recurrencePattern] : undefined;
  if (!patternLabel) return 'Select a recurrence pattern to see a summary.';

  const dayIndex = recurrenceDay !== undefined && recurrenceDay !== '' ? Number(recurrenceDay) : NaN;
  const dayLabel = !Number.isNaN(dayIndex) ? DAY_OF_WEEK_LABELS[dayIndex] : undefined;

  // startDate/endDate here are still-being-edited `datetime-local` strings
  // with no offset — toEventISOString treats them as already being in the
  // fixed event timezone (UTC) rather than letting the browser reinterpret
  // them as its own local time.
  const startISO = toEventISOString(startDate);
  const start = startISO ? new Date(startISO) : null;
  const validStart = start && !isNaN(start.getTime()) ? start : null;
  const endISO = toEventISOString(endDate);
  const end = endISO ? new Date(endISO) : null;
  const validEnd = end && !isNaN(end.getTime()) ? end : null;

  const timeLabel = (d: Date) => d.toLocaleTimeString('en-US', { timeZone: EVENT_TIME_ZONE, hour: 'numeric', minute: '2-digit' });
  const dateLabel = (d: Date) => d.toLocaleDateString('en-US', { timeZone: EVENT_TIME_ZONE, year: 'numeric', month: 'short', day: 'numeric' });

  let summary = `Repeats ${patternLabel}`;
  if (dayLabel) summary += ` on ${dayLabel}s`;
  if (validStart && validEnd) summary += `, ${timeLabel(validStart)}–${timeLabel(validEnd)}`;
  if (validStart) summary += `, starting ${dateLabel(validStart)}`;

  const seriesEnd = recurrenceEndDate ? new Date(recurrenceEndDate) : null;
  const validSeriesEnd = seriesEnd && !isNaN(seriesEnd.getTime()) ? seriesEnd : null;
  summary += validSeriesEnd ? ` through ${dateLabel(validSeriesEnd)}` : ', with no end date set';

  return summary;
}

/**
 * The next occurrence of `event` at or after `from` — for one-time events,
 * just its startDate; for recurring events, the next scheduled occurrence
 * (or the one currently in progress). Returns null once the series has
 * ended (past its recurrenceEndDate).
 */
export function getNextOccurrenceDate(event: ChurchEvent, from: Date = new Date()): Date | null {
  if (!event.isRecurring || !event.recurrencePattern) {
    return new Date(event.startDate);
  }

  const anchorStart = new Date(event.startDate);
  const duration = new Date(event.endDate).getTime() - anchorStart.getTime();
  const seriesEnd = event.recurrenceEndDate ? new Date(event.recurrenceEndDate) : null;

  const current = new Date(anchorStart);
  if (event.recurrenceDay !== undefined && event.recurrenceDay !== null) {
    while (current.getUTCDay() !== event.recurrenceDay) {
      current.setUTCDate(current.getUTCDate() + 1);
    }
    current.setUTCHours(anchorStart.getUTCHours(), anchorStart.getUTCMinutes(), anchorStart.getUTCSeconds(), anchorStart.getUTCMilliseconds());
  }

  const increment = event.recurrencePattern === 'weekly' ? 7 : event.recurrencePattern === 'biweekly' ? 14 : 30;

  let iterations = 0;
  while (iterations < 1000) {
    const occEnd = new Date(current.getTime() + duration);
    if (occEnd >= from) break; // this occurrence hasn't finished yet — it's the next one (or in progress)
    if (event.recurrencePattern === 'monthly') {
      current.setUTCMonth(current.getUTCMonth() + 1);
    } else {
      current.setUTCDate(current.getUTCDate() + increment);
    }
    iterations++;
  }

  if (seriesEnd && current > seriesEnd) return null;

  return current;
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

  // Use UTC-based Date methods throughout: event.startDate is a UTC instant
  // representing the fixed event timezone's wall-clock time, and getDay()/
  // setDate()/etc operate in the *browser's* local timezone — which would
  // shift which weekday/occurrence is computed depending on the viewer.
  const current = new Date(anchorStart);
  if (event.recurrenceDay !== undefined && event.recurrenceDay !== null) {
    while (current.getUTCDay() !== event.recurrenceDay) {
      current.setUTCDate(current.getUTCDate() + 1);
    }
    current.setUTCHours(anchorStart.getUTCHours(), anchorStart.getUTCMinutes(), anchorStart.getUTCSeconds(), anchorStart.getUTCMilliseconds());
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
      current.setUTCMonth(current.getUTCMonth() + 1);
    } else {
      current.setUTCDate(current.getUTCDate() + increment);
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

  // See getCurrentOccurrenceForEvent above for why this uses UTC-based Date
  // methods rather than local ones.
  const current = new Date(anchorStart);
  if (event.recurrenceDay !== undefined && event.recurrenceDay !== null) {
    while (current.getUTCDay() !== event.recurrenceDay) {
      current.setUTCDate(current.getUTCDate() + 1);
    }
    current.setUTCHours(anchorStart.getUTCHours(), anchorStart.getUTCMinutes(), anchorStart.getUTCSeconds(), anchorStart.getUTCMilliseconds());
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
      current.setUTCMonth(current.getUTCMonth() + 1);
    } else {
      current.setUTCDate(current.getUTCDate() + increment);
    }
  }

  return occurrences;
}
