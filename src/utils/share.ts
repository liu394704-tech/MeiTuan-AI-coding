import { dayjs } from './date';
import type { MedicationEvent, FollowUp } from '@/types';

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function toIcsTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function toIcsDate(date: string): string {
  return date.replace(/-/g, '');
}

function escapeIcs(s: string): string {
  return s.replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
}

interface DoseEventInput {
  events: MedicationEvent[];
  medMap: Map<string, { name: string; spec?: string }>;
}

/**
 * Build an .ics calendar file containing all upcoming dose events
 * in the next 14 days. Importable to Apple Calendar / Google Calendar
 * which auto-create alarms.
 */
export function buildDosesIcs({ events, medMap }: DoseEventInput): string {
  const now = dayjs();
  const horizon = now.add(14, 'day');

  const items = events
    .filter((e) => {
      const t = dayjs(e.scheduledAt);
      return t.isAfter(now) && t.isBefore(horizon);
    })
    .map((e) => {
      const med = medMap.get(e.medicationId);
      const title = `服药提醒：${med?.name ?? '药品'} ${e.dosage}${e.unit}`;
      const desc = `${med?.spec ?? ''}\n请按时服药。`;
      const dtStart = toIcsTime(e.scheduledAt);
      const dtEnd = toIcsTime(dayjs(e.scheduledAt).add(15, 'minute').toISOString());
      return [
        'BEGIN:VEVENT',
        `UID:${e.id}@chronic-med-manager`,
        `DTSTAMP:${toIcsTime(new Date().toISOString())}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${escapeIcs(title)}`,
        `DESCRIPTION:${escapeIcs(desc)}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT5M',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeIcs(title)}`,
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n');
    });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Chronic Med Manager//ZH//',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...items,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function buildFollowUpIcs(fu: FollowUp): string {
  const dt = toIcsDate(fu.scheduledDate);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Chronic Med Manager//ZH//',
    'BEGIN:VEVENT',
    `UID:${fu.id}@chronic-med-manager`,
    `DTSTAMP:${toIcsTime(new Date().toISOString())}`,
    `DTSTART;VALUE=DATE:${dt}`,
    `DTEND;VALUE=DATE:${dt}`,
    `SUMMARY:${escapeIcs(`复诊：${fu.hospital ?? ''} ${fu.department ?? ''}`)}`,
    `DESCRIPTION:${escapeIcs(fu.reason ?? '')}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:明天复诊提醒',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadFile(filename: string, content: string, mime = 'text/calendar') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/**
 * Share to family group: try native share (mobile), fallback to clipboard copy.
 */
export async function shareToFamily(payload: { title: string; text: string }): Promise<'shared' | 'copied' | 'failed'> {
  const w = window as unknown as { navigator: Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> } };
  if (w.navigator.share) {
    try {
      await w.navigator.share({ title: payload.title, text: payload.text });
      return 'shared';
    } catch {
      // user cancelled
    }
  }
  try {
    await navigator.clipboard.writeText(`${payload.title}\n${payload.text}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
