import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { useInsights } from '@/hooks/useInsights';
import { useAppStore } from '@/store';
import { dayjs } from '@/utils/date';
import { computeAdherence } from '@/utils/adherence';

export function Insights() {
  const insights = useInsights();
  const events = useAppStore((s) => s.events);

  const trend = useMemo(() => {
    const points: { day: string; score: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const day = dayjs().subtract(i, 'day');
      const dayEvents = events.filter((e) => dayjs(e.scheduledAt).isSame(day, 'day'));
      // For each day, compute taken / scheduled (only past events of that day)
      const past = dayEvents.filter((e) => dayjs(e.scheduledAt).isBefore(dayjs()));
      if (past.length === 0) {
        points.push({ day: day.format('MM-DD'), score: 100 });
        continue;
      }
      const r = computeAdherence(past, 365, day.toDate());
      points.push({ day: day.format('MM-DD'), score: r.score });
    }
    return points;
  }, [events]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold">AI 健康助手</h2>
        <p className="text-ink-500 mt-1">根据您的用药记录与库存情况，给出个性化建议</p>
      </div>

      <Card title="近 14 天依从性趋势">
        <div className="h-64 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="day" stroke="#64748B" />
              <YAxis domain={[0, 100]} stroke="#64748B" />
              <Tooltip
                formatter={(v: number) => [`${v} 分`, '当日依从性']}
                contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#1F6FEB"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="space-y-3">
        {insights.length === 0 && (
          <Card>
            <p className="text-ink-500">暂无建议。坚持记录用药，AI 助手将持续为您分析。</p>
          </Card>
        )}
        {insights.map((i) => (
          <div
            key={i.id}
            className={`card flex items-start gap-4 ${
              i.level === 'danger'
                ? 'border-l-4 border-danger'
                : i.level === 'warn'
                ? 'border-l-4 border-warning'
                : 'border-l-4 border-brand-300'
            }`}
          >
            <div className="text-3xl shrink-0">
              {i.type === 'adherence'
                ? '📈'
                : i.type === 'stock'
                ? '📦'
                : i.type === 'risk'
                ? '⚠️'
                : '💡'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base md:text-lg">{i.title}</h3>
                {i.level === 'danger' && <Tag variant="danger">紧急</Tag>}
                {i.level === 'warn' && <Tag variant="warn">注意</Tag>}
                {i.level === 'info' && <Tag>提示</Tag>}
              </div>
              <p className="text-ink-700 mt-1">{i.body}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-500 text-center pt-4">
        本助手由规则引擎驱动，不构成医疗建议。如有疑问，请咨询医生。
      </p>
    </div>
  );
}
