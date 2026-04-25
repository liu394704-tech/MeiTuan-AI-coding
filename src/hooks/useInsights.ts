import { useMemo } from 'react';
import { useAppStore } from '@/store';
import { runInsights } from '@/ai/insightEngine';

export function useInsights() {
  const user = useAppStore((s) => s.user);
  const medications = useAppStore((s) => s.medications);
  const regimens = useAppStore((s) => s.regimens);
  const inventory = useAppStore((s) => s.inventories);
  const events = useAppStore((s) => s.events);
  const followUps = useAppStore((s) => s.followUps);
  return useMemo(() => {
    if (!user) return [];
    return runInsights({
      user,
      medications,
      regimens,
      inventory,
      events,
      followUps,
      now: new Date(),
    });
  }, [user, medications, regimens, inventory, events, followUps]);
}
