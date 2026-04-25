import type { Insight } from '@/types';
import { computeAdherence } from '@/utils/adherence';
import { uid } from '@/utils/id';
import type { RuleContext, InsightRule } from '../insightEngine';

export const adherenceRule: InsightRule = {
  id: 'adherence',
  run(ctx: RuleContext): Insight[] {
    const r = computeAdherence(ctx.events, 7, ctx.now);
    if (r.scheduled === 0) {
      return [
        {
          id: uid('ins'),
          userId: ctx.user.id,
          type: 'adherence',
          level: 'info',
          title: '暂无近 7 天用药记录',
          body: '记录每一次服药，您将获得依从性评分与个性化建议。',
          createdAt: ctx.now.toISOString(),
        },
      ];
    }
    const level: Insight['level'] = r.score >= 85 ? 'info' : r.score >= 60 ? 'warn' : 'danger';
    const title = `本周用药依从性 ${r.score} 分`;
    let body = `已按时服药 ${r.taken} / ${r.scheduled} 次。`;
    if (r.missed > 0) body += ` 漏服 ${r.missed} 次。`;
    if (r.consecutiveMissedMax >= 2) body += ` 出现连续漏服 ${r.consecutiveMissedMax} 次，请额外注意。`;
    if (r.score >= 85) body += ' 表现很好，继续保持！';
    else if (r.score >= 60) body += ' 建议设置睡前提醒，或请家人协助。';
    else body += ' 风险较高，请尽快与医生沟通用药安排。';

    return [
      {
        id: uid('ins'),
        userId: ctx.user.id,
        type: 'adherence',
        level,
        title,
        body,
        createdAt: ctx.now.toISOString(),
      },
    ];
  },
};
