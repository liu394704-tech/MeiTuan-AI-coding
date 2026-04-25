import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DoseItem } from '@/components/domain/DoseItem';
import { SpeakButton } from '@/components/domain/SpeakButton';
import { useTodayDoses } from '@/hooks/useTodayDoses';
import { dayjs, fmtTime } from '@/utils/date';
import { useAppStore } from '@/store';
import { buildDosesIcs, downloadFile, shareToFamily } from '@/utils/share';

export function Today() {
  const doses = useTodayDoses();
  const events = useAppStore((s) => s.events);
  const meds = useAppStore((s) => s.medications);
  const [tip, setTip] = useState<string | null>(null);

  const groups = useMemo(() => {
    const buckets: Record<string, typeof doses> = { 上午: [], 中午: [], 下午: [], 晚上: [] };
    for (const d of doses) {
      const h = dayjs(d.scheduledAt).hour();
      const key = h < 11 ? '上午' : h < 14 ? '中午' : h < 18 ? '下午' : '晚上';
      buckets[key].push(d);
    }
    return buckets;
  }, [doses]);

  const taken = doses.filter((d) => d.effectiveStatus === 'taken').length;
  const total = doses.length;

  const broadcastText = (() => {
    if (total === 0) return '今日暂无服药安排。';
    const next = doses.find((d) => d.effectiveStatus === 'pending');
    let txt = `今日共 ${total} 次服药，已完成 ${taken} 次。`;
    if (next) txt += `下一次：${fmtTime(next.scheduledAt)} 服 ${next.medicationName} ${next.dosage}${next.unit}。`;
    return txt;
  })();

  function exportIcs() {
    const medMap = new Map(meds.map((m) => [m.id, { name: m.name, spec: m.spec }]));
    const ics = buildDosesIcs({ events, medMap });
    downloadFile('chronic-med-doses.ics', ics);
    setTip('日历文件已下载，可导入到日历 App 设置闹钟');
    setTimeout(() => setTip(null), 2400);
  }

  async function shareSummary() {
    const r = await shareToFamily({ title: '今日服药情况', text: broadcastText });
    setTip(r === 'shared' ? '已分享' : r === 'copied' ? '已复制，可粘贴到家庭群' : '分享失败');
    setTimeout(() => setTip(null), 2400);
  }

  return (
    <div className="space-y-6">
      <div className="card-yellow flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">今日服药</h2>
          <p className="text-ink-700 mt-1">
            已完成 <span className="font-semibold">{taken}</span> / {total} 次
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <SpeakButton text={broadcastText} label="🔊 播报清单" />
          <Button variant="secondary" size="lg" onClick={exportIcs}>
            📅 同步到日历闹钟
          </Button>
          <Button variant="secondary" size="lg" onClick={shareSummary}>
            👨‍👩‍👧 同步到家庭群
          </Button>
        </div>
      </div>

      {tip && (
        <div className="card-yellow text-center font-medium">{tip}</div>
      )}

      {total === 0 && (
        <Card>
          <p className="text-ink-500">今天暂无服药安排。请去"我的药品"添加用药计划。</p>
        </Card>
      )}

      {Object.entries(groups).map(([k, list]) =>
        list.length === 0 ? null : (
          <section key={k}>
            <h3 className="text-base md:text-lg font-semibold text-ink-700 mb-3">{k}</h3>
            <div className="space-y-3">
              {list.map((d) => (
                <DoseItem key={d.id} dose={d} />
              ))}
            </div>
          </section>
        )
      )}
    </div>
  );
}
