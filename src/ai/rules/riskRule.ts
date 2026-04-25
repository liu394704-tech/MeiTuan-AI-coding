import type { Insight } from '@/types';
import { dayjs } from '@/utils/date';
import { uid } from '@/utils/id';
import { forecastStock } from '@/utils/forecast';
import type { InsightRule, RuleContext } from '../insightEngine';

const KEY_PURPOSES = ['降压', '降糖', '抗血小板', '抗凝', '调脂'];

export const riskRule: InsightRule = {
  id: 'risk',
  run(ctx: RuleContext): Insight[] {
    const out: Insight[] = [];
    const since = dayjs(ctx.now).subtract(7, 'day');

    // 1) Critical med missed
    for (const med of ctx.medications) {
      if (!KEY_PURPOSES.some((p) => med.purpose.includes(p))) continue;
      const missed = ctx.events.filter(
        (e) =>
          e.medicationId === med.id &&
          e.status === 'missed' &&
          dayjs(e.scheduledAt).isAfter(since) &&
          dayjs(e.scheduledAt).isBefore(dayjs(ctx.now))
      ).length;
      if (missed >= 1) {
        out.push({
          id: uid('ins'),
          userId: ctx.user.id,
          type: 'risk',
          level: missed >= 2 ? 'danger' : 'warn',
          title: `关键用药"${med.name}"近 7 天漏服 ${missed} 次`,
          body: `${med.purpose}类药物对慢病控制至关重要，建议尽快补服或与医生联系。`,
          relatedIds: [med.id],
          createdAt: ctx.now.toISOString(),
        });
      }
    }

    // 2) Follow-up upcoming + low stock combo
    for (const fu of ctx.followUps) {
      if (fu.status !== 'upcoming') continue;
      const days = dayjs(fu.scheduledDate).diff(dayjs(ctx.now), 'day');
      if (days > 7 || days < 0) continue;
      for (const medId of fu.relatedMedicationIds) {
        const med = ctx.medications.find((m) => m.id === medId);
        if (!med) continue;
        const inv = ctx.inventory.find((i) => i.medicationId === medId);
        const f = forecastStock(med, inv, ctx.regimens);
        if (f.isLow) {
          out.push({
            id: uid('ins'),
            userId: ctx.user.id,
            type: 'risk',
            level: 'warn',
            title: `复诊前请补足"${med.name}"`,
            body: `距复诊还有 ${days} 天，但 ${med.name} 仅够 ${f.daysLeft} 天，建议复诊时一并续方。`,
            relatedIds: [med.id, fu.id],
            createdAt: ctx.now.toISOString(),
          });
        }
      }
    }

    return out;
  },
};
