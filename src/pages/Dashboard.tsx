import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { AdherenceRing } from '@/components/domain/AdherenceRing';
import { SpeakButton } from '@/components/domain/SpeakButton';
import { useAdherence } from '@/hooks/useAdherence';
import { useTodayDoses } from '@/hooks/useTodayDoses';
import { useStockForecasts } from '@/hooks/useStockForecasts';
import { useInsights } from '@/hooks/useInsights';
import { useAppStore } from '@/store';
import { dayjs, fmtTime } from '@/utils/date';
import { buildDosesIcs, downloadFile, shareToFamily } from '@/utils/share';
import { pickSloganOfTheDay, HEALTH_ARTICLES } from '@/data/articles';
import { useState } from 'react';

export function Dashboard() {
  const user = useAppStore((s) => s.user);
  const ad = useAdherence(7);
  const doses = useTodayDoses();
  const stock = useStockForecasts();
  const followUps = useAppStore((s) => s.followUps);
  const insights = useInsights();
  const events = useAppStore((s) => s.events);
  const meds = useAppStore((s) => s.medications);
  const familyFeed = useAppStore((s) => s.familyFeed);
  const [tip, setTip] = useState<string | null>(null);

  const taken = doses.filter((d) => d.effectiveStatus === 'taken').length;
  const total = doses.length;
  const upcoming = doses.find((d) => d.effectiveStatus === 'pending');
  const lowStock = stock.filter((s) => s.isLow);
  const nextFu = followUps
    .filter((f) => f.status === 'upcoming')
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
  const fuDays = nextFu ? dayjs(nextFu.scheduledDate).diff(dayjs(), 'day') : null;
  const slogan = pickSloganOfTheDay();

  const hint = (() => {
    if (lowStock.length > 0)
      return `特别提醒：${lowStock[0].name} 仅够 ${lowStock[0].daysLeft} 天，请及时补药。`;
    if (upcoming)
      return `下一次服药时间 ${fmtTime(upcoming.scheduledAt)}，需要服 ${upcoming.medicationName} ${upcoming.dosage}${upcoming.unit}。`;
    if (total > 0 && taken === total) return `今日 ${total} 次服药已全部完成，做得很棒。`;
    return slogan;
  })();

  const broadcastText =
    `${greeting()}，${user?.name ?? ''}。` +
    `今天需要服药 ${total} 次，已完成 ${taken} 次。` +
    hint +
    (nextFu ? ` 距离下一次复诊还有 ${fuDays} 天。` : '');

  function exportIcs() {
    const medMap = new Map(meds.map((m) => [m.id, { name: m.name, spec: m.spec }]));
    const ics = buildDosesIcs({ events, medMap });
    downloadFile('chronic-med-doses.ics', ics, 'text/calendar');
    setTip('日历文件已下载，请用"日历"App 打开导入');
    setTimeout(() => setTip(null), 2400);
  }

  async function shareSummary() {
    const r = await shareToFamily({ title: '健康简报', text: broadcastText });
    setTip(r === 'shared' ? '已分享' : r === 'copied' ? '简报已复制，可粘贴到家庭群' : '分享失败');
    setTimeout(() => setTip(null), 2400);
  }

  const recommended = (() => {
    const conds = new Set(user?.conditions ?? []);
    return HEALTH_ARTICLES.filter((a) => a.tags.some((t) => conds.has(t))).slice(0, 2);
  })();

  return (
    <div className="space-y-6">
      {/* Hero banner with slogan + voice + CTA */}
      <section className="rounded-xl2 overflow-hidden shadow-soft">
        <div className="bg-hero-yellow p-5 md:p-7 relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-brand-800">
                {dayjs().format('YYYY年MM月DD日 dddd')}
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-ink-900 mt-1">
                {greeting()}，{user?.name ?? ''}
              </h2>
              <p className="text-base md:text-lg text-ink-700 mt-3 font-medium leading-relaxed">
                💛 {slogan}
              </p>
              <p className="text-ink-700 mt-2">{hint}</p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <SpeakButton text={broadcastText} label="🔊 播报今日提醒" className="!bg-white" />
              <Button variant="secondary" size="lg" onClick={exportIcs}>
                📅 同步到日历
              </Button>
              <Button variant="secondary" size="lg" onClick={shareSummary}>
                👨‍👩‍👧 同步到家庭群
              </Button>
            </div>
          </div>
        </div>
        {tip && (
          <div className="bg-brand-50 px-5 py-3 text-center text-ink-700 font-medium border-t border-brand-100">
            {tip}
          </div>
        )}
      </section>

      {/* Golden 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card
          className="md:col-span-2"
          title="今日服药"
          action={
            <Link to="/today" className="text-sm text-brand-700 font-semibold">
              查看全部 →
            </Link>
          }
        >
          <div className="flex items-center gap-6 flex-wrap">
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
            <Link to="/inventory" className="text-sm text-brand-700 font-semibold">
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
                  className="flex items-center justify-between p-3 rounded-lg bg-red-50/60 border border-red-100"
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
            <Link to="/follow-up" className="text-sm text-brand-700 font-semibold">
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

      {/* Family + Articles preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card
          title="家庭动态"
          action={
            <Link to="/family" className="text-sm text-brand-700 font-semibold">
              进入家庭群 →
            </Link>
          }
        >
          {familyFeed.length === 0 ? (
            <p className="text-ink-500">家庭群暂无动态。邀请家人加入吧。</p>
          ) : (
            <ul className="space-y-2">
              {familyFeed.slice(0, 3).map((f) => (
                <li
                  key={f.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-brand-50/60 border border-brand-100"
                >
                  <div className="text-2xl">
                    {f.type === 'cheer' ? '❤️' : f.type === 'low_stock' ? '📦' : '✅'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{f.title}</div>
                    <div className="text-xs text-ink-500 mt-0.5">
                      {dayjs(f.createdAt).format('MM-DD HH:mm')}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="今日健康推文"
          action={
            <Link to="/articles" className="text-sm text-brand-700 font-semibold">
              更多推文 →
            </Link>
          }
        >
          {recommended.length === 0 ? (
            <p className="text-ink-500">暂无推荐，去"健康推文"看看吧。</p>
          ) : (
            <ul className="space-y-3">
              {recommended.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-brand-50/60 border border-brand-100"
                >
                  <div className="text-3xl">{a.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{a.title}</div>
                    <p className="text-sm text-ink-700 mt-0.5 line-clamp-2">{a.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* AI Insights preview */}
      {insights.length > 0 && (
        <Card
          title="AI 健康助手"
          action={
            <Link to="/insights" className="text-sm text-brand-700 font-semibold">
              全部建议 →
            </Link>
          }
        >
          <div className="space-y-3">
            {insights.slice(0, 3).map((i) => (
              <div
                key={i.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-brand-50/60 border border-brand-100"
              >
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
                  <div className="flex items-center gap-2 flex-wrap">
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
