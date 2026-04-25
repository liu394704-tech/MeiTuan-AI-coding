import type { Inventory, Medication, Regimen } from '@/types';

/**
 * Daily consumption for a medication, summed over its regimens.
 */
export function dailyConsumption(medicationId: string, regimens: Regimen[]): number {
  const regs = regimens.filter((r) => r.medicationId === medicationId);
  let perDay = 0;
  for (const r of regs) {
    const f = r.frequency;
    let factor = 1;
    if (f.type === 'daily') factor = 1;
    else if (f.type === 'weekly') factor = (f.weekdays?.length ?? 7) / 7;
    else if (f.type === 'interval') factor = 1 / Math.max(1, f.intervalDays ?? 1);
    perDay += r.dosage * f.timesPerDay * factor;
  }
  return perDay;
}

export interface StockForecast {
  medicationId: string;
  quantity: number;
  unit: string;
  perDay: number;
  daysLeft: number; // floored
  isLow: boolean;
}

export function forecastStock(
  med: Medication,
  inv: Inventory | undefined,
  regimens: Regimen[]
): StockForecast {
  const perDay = dailyConsumption(med.id, regimens);
  const quantity = inv?.quantity ?? 0;
  const unit = inv?.unit ?? med.unit;
  const daysLeft = perDay > 0 ? Math.floor(quantity / perDay) : Infinity;
  const threshold = inv?.lowStockThresholdDays ?? 3;
  const isLow = perDay > 0 && daysLeft <= threshold;
  return { medicationId: med.id, quantity, unit, perDay, daysLeft, isLow };
}
