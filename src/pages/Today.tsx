import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { DoseItem } from '@/components/domain/DoseItem';
import { useTodayDoses } from '@/hooks/useTodayDoses';
import { dayjs } from '@/utils/date';

export function Today() {
  const doses = useTodayDoses();

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold">今日服药</h2>
        <p className="text-ink-500 mt-1">
          已完成 <span className="font-semibold text-ink-700">{taken}</span> / {total} 次
        </p>
      </div>

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
