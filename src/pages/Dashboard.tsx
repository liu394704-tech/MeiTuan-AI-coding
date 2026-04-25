import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { AdherenceRing } from '@/components/domain/AdherenceRing';
import { useAdherence } from '@/hooks/useAdherence';
import { useTodayDoses } from '@/hooks/useTodayDoses';
import { useStockForecasts } from '@/hooks/useStockForecasts';
import { useInsights } from '@/hooks/useInsights';
import { useAppStore } from '@/store';
import { dayjs, fmtTime } from '@/utils/date';

export function Dashboard() {
  const user = useAppStore((s) => s.user);
  const ad = useAdherence(7);
  const doses = useTodayDoses();
  const stock = useStockForecasts();
  const followUps = useAppStore((s) => s.followUps);
  const insights = useInsights();

  const taken = doses.filter((d) => d.effectiveStatus === 'taken').length;
  const total = doses.length;
  const upcoming = doses.find((d) => d.effectiveStatus === 'pending');

  const lowStock = stock.filter((s) => s.isLow);
  const nextFu = followUps
    .filter((f) => f.status === 'upcoming')
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
  const fuDays = nextFu ? dayjs(nextFu.scheduledDate).diff(dayjs(), 'day') : null;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-ink-900">
          {greeting()}，{user?.name ?? ''}
        </h2>
        <p className="text-ink-500 mt-1">今天也要按时服药哦</p>
      </div>

      {/* Golden 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Today */}
        <Card
          className="md:col-span-2"
          title="今日服药"
          action={
            <Link to="/today" className="text-sm text-brand-600 font-medium">
              查看全部 →
            </Link>
          }
        >
          <div className="flex items-center gap-6">
            <AdherenceRing score={total === 0 ? 100 : Math.round((taken / total) * 100)} size={120} />
            <div className="flex-1 min-w-0">
              <div className="text-3xl font-bold text-ink-900">
                {taken}
                <span className="text-base font-normal text-ink-500"> / {total} 次</span>
              </div>
              {upcoming ? (
                <p className="mt-2 text-ink-700">
                  下一次：<span className="font-semibold">{upcoming.medicationName}</span>{' '}
                  · {fmtTime(upcoming.scheduledAt)}
                </p>
              ) : total > 0 ? (
                <p className="mt-2 text-success font-medium">今日服药已全部完成 🎉</p>
              ) : (
                <p className="mt-2 text-ink-500">今日暂无服药安排</p>
              )}
              <Link to="/today">
                <Button className="mt-4" size="lg">
                  去打卡
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Adherence Score */}
        <Card title="本周依从性">
          <div className="flex flex-col items-center">
            <AdherenceRing score={ad.score} size={140} />
            <p className="text-sm text-ink-500 mt-3 text-center">
              过去 7 天 {ad.taken} / {ad.scheduled} 次
              {ad.missed > 0 && <>，漏服 {ad.missed} 次</>}
            </p>
          </div>
        </Card>
      </div>

      {/* Inventory + FollowUp */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card
          title="库存预警"
          action={
            <Link to="/inventory" className="text-sm text-brand-600 font-medium">
              管理 →
            </Link>
          }
        >
          {lowStock.length === 0 ? (
            <p className="text-ink-500">库存充足，暂无预警 ✅</p>
          ) : (
            <div className="space-y-3">
              {lowStock.map((s) => (
                <div
                  key={s.medicationId}
                  className="flex items-center justify-between p-3 rounded-lg bg-red-50/60"
                >
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-sm text-ink-500">
                      剩余 {s.quantity} {s.unit}
                    </div>
                  </div>
                  <Tag variant={s.daysLeft <= 1 ? 'danger' : 'warn'}>仅够 {s.daysLeft} 天</Tag>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="复诊提醒"
          action={
            <Link to="/follow-up" className="text-sm text-brand-600 font-medium">
              安排 →
            </Link>
          }
        >
          {!nextFu ? (
            <p className="text-ink-500">暂无复诊安排</p>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-ink-900">
                  {fuDays! <= 0 ? '今天' : `${fuDays} 天后`}
                </div>
                <div className="text-sm text-ink-500 mt-1">
                  {nextFu.scheduledDate} · {nextFu.hospital ?? ''} {nextFu.department ?? ''}
                </div>
                {nextFu.reason && (
                  <div className="text-sm text-ink-700 mt-1">事由：{nextFu.reason}</div>
                )}
              </div>
              <div className="text-5xl">🩺</div>
            </div>
          )}
        </Card>
      </div>

      {/* AI Insights preview */}
      {insights.length > 0 && (
        <Card
          title="AI 健康助手"
          action={
            <Link to="/insights" className="text-sm text-brand-600 font-medium">
              全部建议 →
            </Link>
          }
        >
          <div className="space-y-3">
            {insights.slice(0, 3).map((i) => (
              <div key={i.id} className="flex items-start gap-3 p-3 rounded-lg bg-ink-100/60">
                <div className="text-2xl">
                  {i.type === 'adherence'
                    ? '📈'
                    : i.type === 'stock'
                    ? '📦'
                    : i.type === 'risk'
                    ? '⚠️'
                    : '💡'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{i.title}</h4>
                    {i.level === 'danger' && <Tag variant="danger">紧急</Tag>}
                    {i.level === 'warn' && <Tag variant="warn">注意</Tag>}
                  </div>
                  <p className="text-sm text-ink-700 mt-1">{i.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}
