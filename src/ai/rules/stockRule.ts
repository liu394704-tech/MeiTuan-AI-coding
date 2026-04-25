import type { Insight } from '@/types';
import { forecastStock } from '@/utils/forecast';
import { uid } from '@/utils/id';
import type { InsightRule, RuleContext } from '../insightEngine';

export const stockRule: InsightRule = {
  id: 'stock',
  run(ctx: RuleContext): Insight[] {
    const out: Insight[] = [];
    for (const med of ctx.medications) {
      const inv = ctx.inventory.find((i) => i.medicationId === med.id);
      const f = forecastStock(med, inv, ctx.regimens);
      if (!isFinite(f.daysLeft) || f.perDay <= 0) continue;
      if (!f.isLow) continue;

      const level: Insight['level'] = f.daysLeft <= 1 ? 'danger' : 'warn';
      out.push({
        id: uid('ins'),
        userId: ctx.user.id,
        type: 'stock',
        level,
        title: `${med.name} 库存仅剩 ${f.daysLeft} 天`,
        body: `当前剩余 ${f.quantity} ${f.unit}，按当前用量预计 ${f.daysLeft} 天后用完，请尽快补药。`,
        relatedIds: [med.id],
        createdAt: ctx.now.toISOString(),
      });
    }
    return out;
  },
};
