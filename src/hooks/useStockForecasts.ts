import { useMemo } from 'react';
import { useAppStore } from '@/store';
import { forecastStock, type StockForecast } from '@/utils/forecast';

export interface StockForecastWithMed extends StockForecast {
  name: string;
  spec: string;
}

export function useStockForecasts(): StockForecastWithMed[] {
  const meds = useAppStore((s) => s.medications);
  const inv = useAppStore((s) => s.inventories);
  const regs = useAppStore((s) => s.regimens);
  return useMemo(
    () =>
      meds.map((m) => {
        const i = inv.find((x) => x.medicationId === m.id);
        const f = forecastStock(m, i, regs);
        return { ...f, name: m.name, spec: m.spec };
      }),
    [meds, inv, regs]
  );
}
