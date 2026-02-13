import { DateRange, DateRangePreset } from '../types';

/** Get today as ISO date string (local) */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Get now as ISO datetime string */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Parse an ISO date string into a Date (local midnight) */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format Date as ISO date string */
export function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Get the start of the week (Monday or Sunday) */
export function startOfWeek(
  date: Date,
  weekStartsOn: 'monday' | 'sunday' = 'monday'
): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = weekStartsOn === 'monday'
    ? (day === 0 ? -6 : 1) - day
    : -day;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Compute a date range from a preset */
export function getDateRange(
  preset: DateRangePreset,
  weekStartsOn: 'monday' | 'sunday' = 'monday'
): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      return { start: formatISODate(today), end: formatISODate(today) };

    case 'this_week': {
      const ws = startOfWeek(today, weekStartsOn);
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      return { start: formatISODate(ws), end: formatISODate(we) };
    }

    case 'this_month': {
      const ms = new Date(today.getFullYear(), today.getMonth(), 1);
      const me = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: formatISODate(ms), end: formatISODate(me) };
    }

    case 'this_year': {
      const ys = new Date(today.getFullYear(), 0, 1);
      const ye = new Date(today.getFullYear(), 11, 31);
      return { start: formatISODate(ys), end: formatISODate(ye) };
    }

    case 'last_7': {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      return { start: formatISODate(s), end: formatISODate(today) };
    }

    case 'last_30': {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      return { start: formatISODate(s), end: formatISODate(today) };
    }

    case 'last_365': {
      const s = new Date(today);
      s.setDate(s.getDate() - 364);
      return { start: formatISODate(s), end: formatISODate(today) };
    }

    default:
      return { start: formatISODate(today), end: formatISODate(today) };
  }
}

/** Shift a date range forward or backward by one period */
export function shiftDateRange(
  range: DateRange,
  direction: 'prev' | 'next',
  preset: DateRangePreset,
  weekStartsOn: 'monday' | 'sunday' = 'monday'
): DateRange {
  const start = parseLocalDate(range.start);
  const end = parseLocalDate(range.end);
  const diff = direction === 'next' ? 1 : -1;

  switch (preset) {
    case 'today': {
      start.setDate(start.getDate() + diff);
      return { start: formatISODate(start), end: formatISODate(start) };
    }
    case 'this_week':
    case 'last_7': {
      start.setDate(start.getDate() + diff * 7);
      end.setDate(end.getDate() + diff * 7);
      return { start: formatISODate(start), end: formatISODate(end) };
    }
    case 'this_month': {
      // For "this month", always snap to full month boundaries (1st → last day).
      // Shifting month number, then rebuild from scratch so we never lose
      // the "last day of month" semantics after passing through short months.
      const targetMonth = start.getMonth() + diff;
      const targetYear = start.getFullYear();
      const ms = new Date(targetYear, targetMonth, 1);
      const me = new Date(targetYear, targetMonth + 1, 0); // last day of target month
      return { start: formatISODate(ms), end: formatISODate(me) };
    }
    case 'last_30': {
      // Clamp day BEFORE calling setMonth to prevent JS Date overflow.
      // e.g. Jan 31 → setMonth(1) would overflow to Mar 3 instead of Feb 28.
      const newStartMonth = start.getMonth() + diff;
      const lastDayOfStartTarget = new Date(start.getFullYear(), newStartMonth + 1, 0).getDate();
      start.setDate(Math.min(start.getDate(), lastDayOfStartTarget));
      start.setMonth(newStartMonth);

      const newEndMonth = end.getMonth() + diff;
      const lastDayOfEndTarget = new Date(end.getFullYear(), newEndMonth + 1, 0).getDate();
      end.setDate(Math.min(end.getDate(), lastDayOfEndTarget));
      end.setMonth(newEndMonth);

      return { start: formatISODate(start), end: formatISODate(end) };
    }
    case 'this_year':
    case 'last_365': {
      start.setFullYear(start.getFullYear() + diff);
      end.setFullYear(end.getFullYear() + diff);
      return { start: formatISODate(start), end: formatISODate(end) };
    }
    default:
      return range;
  }
}

/** Format a date range for display */
export function formatDateRange(range: DateRange): string {
  if (range.start === range.end) return range.start;
  return `${range.start} — ${range.end}`;
}
