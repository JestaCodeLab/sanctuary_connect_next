export type DatePreset = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

export const datePresetOptions: { value: DatePreset; label: string }[] = [
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom' },
];

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

export function getPresetRange(preset: Exclude<DatePreset, 'custom'>): { start: string; end: string } {
  const now = new Date();
  if (preset === 'this_week') {
    const start = startOfWeek(now);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: toDateStr(start), end: toDateStr(end) };
  }
  if (preset === 'last_week') {
    const start = startOfWeek(now);
    start.setDate(start.getDate() - 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: toDateStr(start), end: toDateStr(end) };
  }
  if (preset === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: toDateStr(start), end: toDateStr(end) };
  }
  // last_month
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return { start: toDateStr(start), end: toDateStr(end) };
}
