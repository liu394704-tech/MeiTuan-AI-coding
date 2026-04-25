import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { useAppStore } from '@/store';
import { useStockForecasts } from '@/hooks/useStockForecasts';

export function MedicationList() {
  const meds = useAppStore((s) => s.medications);
  const regs = useAppStore((s) => s.regimens);
  const forecasts = useStockForecasts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">我的药品</h2>
          <p className="text-ink-500 mt-1">共 {meds.length} 种</p>
        </div>
        <Link to="/medications/new">
          <Button size="lg">+ 添加药品</Button>
        </Link>
      </div>

      {meds.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-6xl">💊</div>
            <p className="text-ink-500 mt-4">还没有添加药品</p>
            <Link to="/medications/new">
              <Button className="mt-4" size="lg">
                添加第一种药品
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meds.map((m) => {
            const reg = regs.find((r) => r.medicationId === m.id);
            const f = forecasts.find((x) => x.medicationId === m.id);
            return (
              <Link key={m.id} to={`/medications/${m.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-brand-50 text-2xl flex items-center justify-center shrink-0">
                      💊
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base md:text-lg">{m.name}</h3>
                        <Tag variant="info">{m.purpose}</Tag>
                      </div>
                      <p className="text-sm text-ink-500 mt-1">{m.spec}</p>
                      {reg && (
                        <p className="text-sm text-ink-700 mt-2">
                          {describeFreq(reg.frequency)} · 单次 {reg.dosage}
                          {reg.unit}
                        </p>
                      )}
                      {f && (
                        <p className="text-sm mt-2">
                          库存：
                          <span className="font-semibold">
                            {f.quantity}
                            {f.unit}
                          </span>
                          {isFinite(f.daysLeft) && (
                            <span className={`ml-2 ${f.isLow ? 'text-danger' : 'text-ink-500'}`}>
                              · 仅够 {f.daysLeft} 天
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function describeFreq(f: { type: string; timesPerDay: number; weekdays?: number[]; intervalDays?: number; times: string[] }): string {
  if (f.type === 'daily') return `每日 ${f.timesPerDay} 次（${f.times.join('、')}）`;
  if (f.type === 'weekly')
    return `每周 ${f.weekdays?.length ?? 0} 天 · 每天 ${f.timesPerDay} 次`;
  if (f.type === 'interval') return `每 ${f.intervalDays ?? 1} 天 · 每天 ${f.timesPerDay} 次`;
  return '';
}
