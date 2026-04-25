import type { MedicationEvent } from '@/types';
import { dayjs } from './date';

export interface AdherenceResult {
  score: number; // 0-100
  taken: number;
  scheduled: number;
  missed: number;
  skipped: number;
  consecutiveMissedMax: number;
}

/**
 * Compute adherence over the past N days (default 7).
 * Only considers events whose scheduledAt is in the past (now-relative).
 */
export function computeAdherence(
  events: MedicationEvent[],
  days = 7,
  now: Date = new Date()
): AdherenceResult {
  const since = dayjs(now).subtract(days, 'day').startOf('day');
  const upto = dayjs(now);

  const past = events
    .filter((e) => dayjs(e.scheduledAt).isAfter(since) && dayjs(e.scheduledAt).isBefore(upto))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  let taken = 0;
  let missed = 0;
  let skipped = 0;
  let consecutive = 0;
  let consecutiveMax = 0;

  for (const e of past) {
    if (e.status === 'taken') {
      taken++;
      consecutive = 0;
    } else if (e.status === 'skipped') {
      skipped++;
      consecutive = 0;
    } else {
      // pending in the past = missed
      missed++;
      consecutive++;
      consecutiveMax = Math.max(consecutiveMax, consecutive);
    }
  }

  const scheduled = past.length;
  if (scheduled === 0) {
    return {
      score: 100,
      taken: 0,
      scheduled: 0,
      missed: 0,
      skipped: 0,
      consecutiveMissedMax: 0,
    };
  }

  const base = (taken / scheduled) * 100;
  // Penalty for consecutive misses: 2-in-a-row -10, 3+ -20
  const penalty = consecutiveMax >= 3 ? 20 : consecutiveMax >= 2 ? 10 : 0;
  const score = Math.max(0, Math.round(base - penalty));

  return {
    score,
    taken,
    scheduled,
    missed,
    skipped,
    consecutiveMissedMax: consecutiveMax,
  };
}
