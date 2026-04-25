import type { ConditionCode, Insight } from '@/types';
import { uid } from '@/utils/id';
import type { InsightRule, RuleContext } from '../insightEngine';

const TIPS: Record<ConditionCode, string[]> = {
  hypertension: [
    '清晨服降压药前，建议先静坐 5 分钟测一次血压，便于评估药效。',
    '少盐少油，每日盐摄入 < 5g，对血压控制非常有帮助。',
  ],
  type2_diabetes: [
    '二甲双胍建议随餐或餐后服用，可减少胃肠不适。',
    '建议每周记录 2 次空腹与餐后 2 小时血糖。',
  ],
  hyperlipidemia: ['他汀类药物建议睡前服用，效果更佳。'],
  coronary_heart_disease: ['若出现胸痛、胸闷请立即停止活动并就医，不要自行加药。'],
  chronic_kidney_disease: ['请避免使用未经医生同意的中草药或非处方止痛药。'],
  other: ['坚持规律作息与适度运动，有助于慢病管理。'],
};

export const tipRule: InsightRule = {
  id: 'tip',
  run(ctx: RuleContext): Insight[] {
    const out: Insight[] = [];
    const seen = new Set<string>();
    for (const c of ctx.user.conditions) {
      const list = TIPS[c] ?? TIPS.other;
      // pick 1 deterministic-ish tip per condition based on day-of-year
      const day = Math.floor(ctx.now.getTime() / (24 * 3600 * 1000));
      const tip = list[day % list.length];
      if (seen.has(tip)) continue;
      seen.add(tip);
      out.push({
        id: uid('ins'),
        userId: ctx.user.id,
        type: 'tip',
        level: 'info',
        title: `健康小贴士`,
        body: tip,
        createdAt: ctx.now.toISOString(),
      });
    }
    // Limit tip to max 1 per day to avoid noise
    return out.slice(0, 1);
  },
};
