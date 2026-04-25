import { useMemo } from 'react';
import { useAppStore } from '@/store';
import { dayjs } from '@/utils/date';
import type { MedicationEvent } from '@/types';

export interface TodayDose extends MedicationEvent {
  medicationName: string;
  spec: string;
  effectiveStatus: 'taken' | 'pending' | 'missed' | 'skipped';
}

/**
 * Today's doses, with status normalization:
 * - past pending → "missed" (display only; underlying status stays pending until user acts)
 */
export function useTodayDoses(): TodayDose[] {
  const events = useAppStore((s) => s.events);
  const meds = useAppStore((s) => s.medications);
  return useMemo(() => {
    const todayStart = dayjs().startOf('day');
    const todayEnd = dayjs().endOf('day');
    const now = dayjs();
    return events
      .filter((e) => {
        const t = dayjs(e.scheduledAt);
        return t.isAfter(todayStart) && t.isBefore(todayEnd);
      })
      .map((e) => {
        const med = meds.find((m) => m.id === e.medicationId);
        let effective: TodayDose['effectiveStatus'] = e.status;
        if (e.status === 'pending' && dayjs(e.scheduledAt).isBefore(now.subtract(15, 'minute'))) {
          effective = 'missed';
        }
        return {
          ...e,
          medicationName: med?.name ?? '未知药品',
          spec: med?.spec ?? '',
          effectiveStatus: effective,
        };
      })
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }, [events, meds]);
}
