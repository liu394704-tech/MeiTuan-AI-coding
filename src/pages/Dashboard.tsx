import { Link } from 'react-router-dom';
import { useState } from 'react';
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
import { computeHealthScore, generateRecommendations } from '@/utils/healthScore';

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
  const vitals = useAppStore((s) => s.vitals);
  const reports = useAppStore((s) => s.reports);
  const takeDose = useAppStore((s) => s.takeDose);
  const [tip, setTip] = useState<string | null>(null);

  const health = computeHealthScore({ user, events, vitals, reports });
  const topRec = generateRecommendations(health, user?.conditions ?? [])[0];

  const taken = doses.filter((d) => d.effectiveStatus === 'taken').length;
  const total = doses.length;
  const upcoming = doses.find((d) => d.effectiveStatus === 'pending');
  const lowStock = stock.filter((s) => s.isLow);
  const nextFu = followUps
    .filter((f) => f.status === 'upcoming')
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
  const fuDays = nextFu ? dayjs(nextFu.scheduledDate).diff(dayjs(), 'day') : null;
  const slogan = pickSloganOfTheDay();

  const broadcastText =
    `${greeting()}，${user?.name ?? ''}。今天需要服药 ${total} 次，已完成 ${taken} 次。` +
    (upcoming
      ? `下一次：${fmtTime(upcoming.scheduledAt)} 服 ${upcoming.medicationName} ${upcoming.dosage}${upcoming.unit}。`
      : '') +
    (lowStock.length > 0
      ? `特别提醒：${lowStock[0].name} 仅够 ${lowStock[0].daysLeft} 天，请尽快补药。`
      : '') +
    (nextFu ? `距离下一次复诊还有 ${fuDays} 天。` : '');

  function exportIcs() {
    const medMap = new Map(meds.map((m) => [m.id, { name: m.name, spec: m.spec }]));
    const ics = buildDosesIcs({ events, medMap });
    downloadFile('chronic-med-doses.ics', ics);
    setTip('日历文件已下载，请用日历 App 导入');
    setTimeout(() => setTip(null), 2200);
  }

  async function shareSummary() {
    const r = await shareToFamily({ title: '健康简报', text: broadcastText });
    setTip(r === 'shared' ? '已分享' : r === 'copied' ? '简报已复制，可粘贴到家庭群' : '分享失败');
    setTimeout(() => setTip(null), 2200);
  }

  const recommended = (() => {
    const conds = new Set(user?.conditions ?? []);
    return HEALTH_ARTICLES.filter((a) => a.tags.some((t) => conds.has(t)))[0];
  })();

  const adColor = ad.score >= 85 ? 'text-success' : ad.score >= 60 ? 'text-warning' : 'text-danger';

  return (
    <div className="space-y-5">
      {/* 1. 极简问候条 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs md:text-sm text-ink-500">{dayjs().format('YYYY年M月D日 dddd')}</p>
          <h2 className="text-2xl md:text-3xl font-bold text-ink-900 mt-1">
            {greeting()}，{user?.name ?? ''}
          </h2>
          <p className="text-ink-500 mt-1 text-sm md:text-base">💛 {slogan}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <SpeakButton text={broadcastText} label="🔊 播报" />
          <Button variant="secondary" size="lg" onClick={exportIcs}>📅 同步日历</Button>
          <Button variant="secondary" size="lg" onClick={shareSummary}>👨‍👩‍👧 分享给家人</Button>
        </div>
      </div>

      {tip && (
        <div className="rounded-xl px-4 py-3 bg-brand-50 border border-brand-200 text-center text-ink-700 font-medium">
          {tip}
        </div>
      )}

      {/* 2. 头号焦点：下一次该吃什么 */}
      <section className="rounded-xl2 shadow-soft border border-brand-200 overflow-hidden bg-white">
        <div className="px-5 md:px-6 py-3 bg-brand-50 border-b border-brand-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⏰</span>
            <span className="font-semibold text-ink-900">下一次服药</span>
          </div>
          <Link to="/reminders" className="text-sm text-brand-700 font-semibold">
            查看完整清单 →
          </Link>
        </div>
        <div className="p-5 md:p-6">
          {upcoming ? (
            <div className="flex items-center gap-5 flex-wrap">
              <div className="flex flex-col items-center justify-center bg-brand-50 rounded-2xl px-5 py-4 shrink-0 border border-brand-200">
                <div className="text-xs text-ink-500">服药时间</div>
                <div className="text-3xl md:text-4xl font-bold text-ink-900">{fmtTime(upcoming.scheduledAt)}</div>
              </div>
              <div className="flex-1 min-w-[180px]">
                <div className="text-xl md:text-2xl font-semibold text-ink-900">{upcoming.medicationName}</div>
                <div className="text-ink-500 mt-1">
                  {upcoming.spec} · 单次 <span className="font-semibold text-ink-700">{upcoming.dosage} {upcoming.unit}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="xl" onClick={() => takeDose(upcoming.id)}>
                  ✓ 已服药
                </Button>
                <Link to="/reminders">
                  <Button variant="secondary" size="lg">查看全部</Button>
                </Link>
              </div>
            </div>
          ) : total > 0 ? (
            <div className="flex items-center gap-4">
              <div className="text-5xl">🎉</div>
              <div>
                <div className="text-xl md:text-2xl font-bold text-success">今日服药已全部完成</div>
                <div className="text-ink-500 mt-1">{total} 次服药全部按时完成，做得很棒！</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="text-5xl">📋</div>
              <div>
                <div className="text-xl font-bold text-ink-900">今日暂无服药安排</div>
                <Link to="/medications/new" className="text-brand-700 font-semibold">添加第一种药品 →</Link>
              </div>
            </div>
          )}

          {/* progress strip */}
          <div className="mt-5">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-ink-500">今日进度</span>
              <span className="font-semibold text-ink-700">{taken} / {total}</span>
            </div>
            <div className="h-2.5 rounded-full bg-brand-50 overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all"
                style={{ width: `${total === 0 ? 100 : (taken / total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. 关键预警（只在有事时出现，最显眼） */}
      {(lowStock.length > 0 || (insights[0] && insights[0].level === 'danger')) && (
        <section className="rounded-xl2 border border-red-200 bg-red-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <div className="font-semibold text-danger mb-1">需要立即关注</div>
              <ul className="space-y-1 text-ink-900">
                {lowStock.slice(0, 2).map((s) => (
                  <li key={s.medicationId}>
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-ink-700"> 库存仅够 {s.daysLeft} 天，请尽快补药。</span>
                  </li>
                ))}
                {insights[0]?.level === 'danger' && <li className="text-ink-900">{insights[0].title}</li>}
              </ul>
              <div className="mt-3 flex gap-2 flex-wrap">
                {lowStock.length > 0 && (
                  <Link to="/medications">
                    <Button size="md">去补药</Button>
                  </Link>
                )}
                <Link to="/insights">
                  <Button variant="secondary" size="md">查看全部建议</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. 三件次要信息：依从性 / 复诊 / 推文 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <AdherenceRing score={ad.score} size={86} />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-ink-500">本周依从性</div>
              <div className={`text-2xl font-bold ${adColor}`}>{ad.score}<span className="text-sm font-normal text-ink-500"> 分</span></div>
              <div className="text-xs text-ink-500 mt-0.5">{ad.taken} / {ad.scheduled} 次{ad.missed > 0 ? `，漏 ${ad.missed} 次` : ''}</div>
            </div>
          </div>
        </Card>

        <Link to="/reminders">
          <Card className="hover:shadow-glow transition-shadow h-full">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🩺</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink-500">下次复诊</div>
                {nextFu ? (
                  <>
                    <div className="text-2xl font-bold text-ink-900">
                      {fuDays! <= 0 ? '今天' : `${fuDays} 天后`}
                    </div>
                    <div className="text-xs text-ink-500 mt-0.5 truncate">
                      {nextFu.scheduledDate} · {nextFu.hospital ?? ''}
                    </div>
                  </>
                ) : (
                  <div className="text-base font-semibold text-ink-700 mt-1">暂无安排</div>
                )}
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/articles">
          <Card className="hover:shadow-glow transition-shadow h-full">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{recommended?.emoji ?? '📰'}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink-500">今日推文</div>
                <div className="font-semibold text-ink-900 truncate mt-0.5">
                  {recommended?.title ?? '前往健康推文'}
                </div>
                {recommended && <div className="text-xs text-ink-500 mt-0.5 line-clamp-1">{recommended.summary}</div>}
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* 5. 家庭群最新一条 */}
      <Card
        title="家庭群"
        action={
          <Link to="/family" className="text-sm text-brand-700 font-semibold">
            进入群聊 →
          </Link>
        }
      >
        {familyFeed.length === 0 ? (
          <p className="text-ink-500">家庭群暂无消息。</p>
        ) : (
          <ul className="space-y-2">
            {[...familyFeed]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .filter((f) => f.type !== 'system')
              .slice(0, 2)
              .map((f) => (
                <li key={f.id} className="flex items-start gap-3">
                  <div className="text-xl shrink-0">
                    {f.type === 'cheer' ? '💬' : f.type === 'low_stock' ? '📦' : f.type === 'restock' ? '🛒' : '✅'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-ink-900 truncate">{f.title}</div>
                    <div className="text-xs text-ink-500 mt-0.5">{dayjs(f.createdAt).format('MM-DD HH:mm')}</div>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </Card>

      {/* 6. 综合健康评分预览 */}
      <Card
        title="AI 健康助手"
        action={
          <Link to="/insights" className="text-sm text-brand-700 font-semibold">
            打开综合分析 →
          </Link>
        }
      >
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-extrabold text-xl ${
                health.verdict === 'good'
                  ? 'bg-success'
                  : health.verdict === 'fair'
                  ? 'bg-warning'
                  : 'bg-danger'
              }`}
            >
              {health.overall}
            </div>
            <div>
              <div className="text-sm text-ink-500">综合健康分</div>
              <div className="font-semibold text-ink-900">
                {health.verdict === 'good' ? '状态良好' : health.verdict === 'fair' ? '需要关注' : '需要重点干预'}
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-[200px] grid grid-cols-2 sm:grid-cols-4 gap-2">
            {health.subs.map((s) => (
              <div key={s.key} className="text-center px-2 py-2 rounded-lg bg-brand-50/60 border border-brand-100">
                <div className="text-xs text-ink-500">{s.emoji} {s.label}</div>
                <div className="text-lg font-bold text-ink-900">{s.score}</div>
              </div>
            ))}
          </div>
        </div>
        {topRec && (
          <div className="mt-4 p-3 rounded-xl border border-brand-200 bg-brand-50/50">
            <div className="flex items-center gap-2">
              <span className="text-xl">{topRec.emoji}</span>
              <Tag>{topRec.category}</Tag>
              <span className="font-semibold text-ink-900">{topRec.title}</span>
            </div>
            <p className="text-sm text-ink-700 mt-1">{topRec.body}</p>
          </div>
        )}
      </Card>
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
