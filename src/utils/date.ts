import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

export function todayStr(): string {
  return dayjs().format('YYYY-MM-DD');
}

export function fmtDate(d: string | Date): string {
  return dayjs(d).format('YYYY-MM-DD');
}

export function fmtDateTime(d: string | Date): string {
  return dayjs(d).format('YYYY-MM-DD HH:mm');
}

export function fmtTime(d: string | Date): string {
  return dayjs(d).format('HH:mm');
}

export function isToday(d: string | Date): boolean {
  return dayjs(d).isSame(dayjs(), 'day');
}

export function daysBetween(a: string | Date, b: string | Date): number {
  return dayjs(b).startOf('day').diff(dayjs(a).startOf('day'), 'day');
}

export function addDays(d: string | Date, n: number): string {
  return dayjs(d).add(n, 'day').format('YYYY-MM-DD');
}

export function startOfDay(d: string | Date): Date {
  return dayjs(d).startOf('day').toDate();
}

export function endOfDay(d: string | Date): Date {
  return dayjs(d).endOf('day').toDate();
}

export function weekdayIndex(d: string | Date): number {
  // Returns 1-7 where 1=Mon ... 7=Sun
  const dow = dayjs(d).day(); // 0-6 (Sun=0)
  return dow === 0 ? 7 : dow;
}

export { dayjs };
