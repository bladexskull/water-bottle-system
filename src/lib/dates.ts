import { format, startOfMonth, endOfMonth, getDaysInMonth, parseISO } from "date-fns";

export function currentMonth(): string {
  return format(new Date(), "yyyy-MM");
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function monthFromDate(date: string): string {
  return date.slice(0, 7);
}

export function monthBounds(month: string): { start: string; end: string } {
  const d = parseISO(`${month}-01`);
  return {
    start: format(startOfMonth(d), "yyyy-MM-dd"),
    end: format(endOfMonth(d), "yyyy-MM-dd"),
  };
}

export function daysRemainingInMonth(month: string): number {
  const today = todayISO();
  if (!today.startsWith(month)) {
    const cur = currentMonth();
    if (month < cur) return 0;
    const bounds = monthBounds(month);
    return getDaysInMonth(parseISO(`${month}-01`));
  }
  const end = monthBounds(month).end;
  const t = parseISO(today);
  const e = parseISO(end);
  const diff = Math.ceil((e.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function isFutureDate(date: string): boolean {
  return date > todayISO();
}

export function isToday(date: string): boolean {
  return date === todayISO();
}
