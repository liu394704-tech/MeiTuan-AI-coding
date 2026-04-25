import { dayjs, weekdayIndex } from './date';
import type { Medication, Regimen, MedicationEvent } from '@/types';

interface GenerateInput {
  userId: string;
  medications: Medication[];
  regimens: Regimen[];
  from: Date;
  to: Date; // inclusive
}

/**
 * Pure: deterministic event ID for a given (med, scheduled time)
 */
export function deterministicEventId(medicationId: string, scheduledIso: string) {
  const stamp = dayjs(scheduledIso).format('YYYYMMDDHHmm');
  return `evt_${stamp}_${medicationId}`;
}

/**
 * Generate scheduled events from regimens between [from, to].
 * Pure / idempotent: same inputs → same outputs (same ids).
 */
export function generateScheduledEvents(input: GenerateInput): MedicationEvent[] {
  const { userId, medications, regimens, from, to } = input;
  const events: MedicationEvent[] = [];
  const medMap = new Map(medications.map((m) => [m.id, m]));

  for (const reg of regimens) {
    const med = medMap.get(reg.medicationId);
    if (!med) continue;

    const start = dayjs.max(dayjs(med.startDate).startOf('day'), dayjs(from).startOf('day'));
    const endMed = med.endDate ? dayjs(med.endDate).endOf('day') : dayjs(to).endOf('day');
    const end = dayjs.min(endMed, dayjs(to).endOf('day'));

    if (!start || !end || end.isBefore(start)) continue;

    let cursor = start.startOf('day');
    let dayCounter = 0;
    while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
      const include = shouldIncludeDay(cursor.toDate(), reg, dayCounter);
      if (include) {
        for (const t of reg.frequency.times) {
          const [hh, mm] = t.split(':').map((x) => parseInt(x, 10));
          if (Number.isNaN(hh) || Number.isNaN(mm)) continue;
          const scheduledAt = cursor
            .hour(hh)
            .minute(mm)
            .second(0)
            .millisecond(0)
            .toISOString();
          events.push({
            id: deterministicEventId(med.id, scheduledAt),
            userId,
            medicationId: med.id,
            regimenId: reg.id,
            scheduledAt,
            status: 'pending',
            takenAt: null,
            dosage: reg.dosage,
            unit: reg.unit,
            source: 'auto',
          });
        }
      }
      cursor = cursor.add(1, 'day');
      dayCounter++;
    }
  }
  return events.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

function shouldIncludeDay(date: Date, reg: Regimen, dayIndex: number): boolean {
  const f = reg.frequency;
  if (f.type === 'daily') return true;
  if (f.type === 'weekly') {
    const wd = weekdayIndex(date);
    return Boolean(f.weekdays?.includes(wd));
  }
  if (f.type === 'interval') {
    const step = Math.max(1, f.intervalDays ?? 1);
    return dayIndex % step === 0;
  }
  return false;
}

// Add dayjs.min/max polyfill (dayjs doesn't include by default without plugin)
// We extend at module load to avoid side-effect cycles.
import minMax from 'dayjs/plugin/minMax';
dayjs.extend(minMax);
