import { useMemo } from 'react';
import { useAppStore } from '@/store';
import { computeAdherence } from '@/utils/adherence';

export function useAdherence(days = 7) {
  const events = useAppStore((s) => s.events);
  return useMemo(() => computeAdherence(events, days), [events, days]);
}
