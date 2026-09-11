import {
  format,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  parseISO,
  isValid,
} from "date-fns";

const MONTH_RE = /^\d{4}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function currentMonth(): string {
  return format(new Date(), "yyyy-MM");
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function monthFromDate(date: string): string {
  return date.slice(0, 7);
}

export function isValidMonth(month: string | null | undefined): month is string {
  if (!month || !MONTH_RE.test(month)) return false;
  const d = parseISO(`${month}-01`);
  return isValid(d);
}

export function isValidDateString(date: string | null | undefined): date is string {
  if (!date || !DATE_RE.test(date)) return false;
  return isValid(parseISO(date));
}

export function monthBounds(month: string): { start: string; end: string } {
  const safe = isValidMonth(month) ? month : currentMonth();
  const d = parseISO(`${safe}-01`);
  return {
    start: format(startOfMonth(d), "yyyy-MM-dd"),
    end: format(endOfMonth(d), "yyyy-MM-dd"),
  };
}

export function daysRemainingInMonth(month: string): number {
  if (!isValidMonth(month)) return 0;
  const today = todayISO();
  if (!today.startsWith(month)) {
    const cur = currentMonth();
    if (month < cur) return 0;
    return getDaysInMonth(parseISO(`${month}-01`));
  }
  const end = monthBounds(month).end;
  const t = parseISO(today);
  const e = parseISO(end);
  if (!isValid(t) || !isValid(e)) return 0;
  const diff = Math.ceil((e.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function isFutureDate(date: string): boolean {
  if (!isValidDateString(date)) return true;
  return date > todayISO();
}

export function isToday(date: string): boolean {
  return isValidDateString(date) && date === todayISO();
}
