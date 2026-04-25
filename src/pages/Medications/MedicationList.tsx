import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { Modal } from '@/components/ui/Modal';
import { Field, NumberInput } from '@/components/ui/Input';
import { StockBar } from '@/components/domain/StockBar';
import { useAppStore } from '@/store';
import { useStockForecasts } from '@/hooks/useStockForecasts';

type Filter = 'all' | 'low';

export function MedicationList() {
  const meds = useAppStore((s) => s.medications);
  const regs = useAppStore((s) => s.regimens);
  const inventories = useAppStore((s) => s.inventories);
  const restock = useAppStore((s) => s.restock);
  const setThreshold = useAppStore((s) => s.setThreshold);
  const forecasts = useStockForecasts();

  const [filter, setFilter] = useState<Filter>('all');
  const [restockId, setRestockId] = useState<string | null>(null);
  const [restockAmt, setRestockAmt] = useState(30);
  const [copied, setCopied] = useState(false);

  const lowList = useMemo(() => forecasts.filter((x) => x.isLow), [forecasts]);

  const visible = useMemo(() => {
    return meds.map((m) => ({
      med: m,
      reg: regs.find((r) => r.medicationId === m.id),
      inv: inventories.find((i) => i.medicationId === m.id),
      forecast: forecasts.find((f) => f.medicationId === m.id),
    })).filter((row) => filter === 'all' || row.forecast?.isLow);
  }, [meds, regs, inventories, forecasts, filter]);

  const shoppingList = useMemo(
    () =>
      lowList
        .map(
          (x) =>
            `${x.name} ${x.spec} - 建议补充 ${Math.max(30, Math.ceil(x.perDay * 30))} ${x.unit}`
        )
        .join('\n'),
    [lowList]
  );

  async function copyShoppingList() {
    try {
      await navigator.clipboard.writeText(shoppingList);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">我的药品 · 库存</h2>
          <p className="text-ink-500 mt-1">
            共 {meds.length} 种 · 库存预警 <span className={lowList.length > 0 ? 'text-danger font-semibold' : ''}>{lowList.length}</span> 项
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {lowList.length > 0 && (
            <Button variant="secondary" size="lg" onClick={copyShoppingList}>
              {copied ? '已复制 ✓' : '📋 复制购药清单'}
            </Button>
          )}
          <Link to="/medications/new">
            <Button size="lg">+ 添加药品</Button>
          </Link>
        </div>
      </div>

      {/* 库存预警条（只在有低库存时出现） */}
      {lowList.length > 0 && (
        <section className="rounded-xl2 border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <div className="font-semibold text-danger mb-1">
                库存即将耗尽（{lowList.length} 项）
              </div>
              <div className="space-y-1">
                {lowList.map((x) => (
                  <div key={x.medicationId} className="flex items-center gap-2 text-ink-900">
                    <span className="font-semibold">{x.name}</span>
                    <span className="text-ink-700">仅够 {x.daysLeft} 天（剩 {x.quantity}{x.unit}）</span>
                    <Button
                      size="md"
                      onClick={() => { setRestockId(x.medicationId); setRestockAmt(30); }}
                    >
                      + 补药
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 切换：全部 / 仅看预警 */}
      <div className="flex gap-2 items-center">
        {(['all', 'low'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              filter === f
                ? 'bg-brand-500 text-ink-900 shadow-glow'
                : 'bg-white border border-brand-200 text-ink-700'
            }`}
            style={{ minHeight: 44 }}
          >
            {f === 'all' ? `全部 (${meds.length})` : `仅预警 (${lowList.length})`}
          </button>
        ))}
      </div>

      {/* 药品 + 库存 合并卡片 */}
      {meds.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-6xl">💊</div>
            <p className="text-ink-500 mt-4">还没有添加药品</p>
            <Link to="/medications/new">
              <Button className="mt-4" size="lg">添加第一种药品</Button>
            </Link>
          </div>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <p className="text-ink-500 text-center py-6">当前无库存预警 ✅</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map(({ med: m, reg, inv, forecast }) => (
            <Card key={m.id} className="!p-0 overflow-hidden">
              {/* 上半段：药品基本信息（点击进详情） */}
              <Link to={`/medications/${m.id}`} className="block px-5 pt-5 pb-4 hover:bg-brand-50/40 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-brand-50 text-2xl flex items-center justify-center shrink-0 border border-brand-100">
                    💊
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base md:text-lg">{m.name}</h3>
                      <Tag variant="info">{m.purpose}</Tag>
                      {forecast?.isLow && (
                        <Tag variant={forecast.daysLeft <= 1 ? 'danger' : 'warn'}>
                          仅够 {forecast.daysLeft} 天
                        </Tag>
                      )}
                    </div>
                    <p className="text-sm text-ink-500 mt-1">{m.spec}</p>
                    {reg && (
                      <p className="text-sm text-ink-700 mt-2">
                        {describeFreq(reg.frequency)} · 单次 {reg.dosage}{reg.unit}
                      </p>
                    )}
                  </div>
                </div>
              </Link>

              {/* 下半段：库存条 + 操作 */}
              <div className="px-5 pb-5 pt-3 border-t border-brand-100 bg-brand-50/30">
                <div className="flex items-center justify-between mb-2 gap-3">
                  <div className="text-sm text-ink-700">
                    库存：
                    <span className="font-semibold text-ink-900">
                      {inv?.quantity ?? 0} {inv?.unit ?? m.unit}
                    </span>
                    {forecast && forecast.perDay > 0 && (
                      <span className="text-xs text-ink-500 ml-2">日均 {forecast.perDay.toFixed(2)}{forecast.unit}</span>
                    )}
                  </div>
                  <Button size="md" onClick={() => { setRestockId(m.id); setRestockAmt(30); }}>
                    + 补药
                  </Button>
                </div>
                {forecast && (
                  <StockBar
                    daysLeft={forecast.daysLeft}
                    threshold={inv?.lowStockThresholdDays ?? 3}
                    max={Math.max(30, forecast.daysLeft + 5)}
                  />
                )}
                {inv && (
                  <div className="flex items-center gap-2 mt-3 text-sm">
                    <span className="text-ink-500">预警阈值：</span>
                    <NumberInput
                      value={inv.lowStockThresholdDays}
                      min={1}
                      className="!w-24 !min-h-[40px] !py-1.5"
                      onChange={(e) => setThreshold(m.id, parseInt(e.target.value) || 3)}
                    />
                    <span className="text-ink-500">天</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!restockId}
        onClose={() => setRestockId(null)}
        title="补充库存"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRestockId(null)}>取消</Button>
            <Button
              onClick={async () => {
                if (restockId) {
                  await restock(restockId, restockAmt);
                  setRestockId(null);
                }
              }}
            >
              确认补药
            </Button>
          </>
        }
      >
        <Field label="本次补药数量">
          <NumberInput value={restockAmt} min={1} onChange={(e) => setRestockAmt(parseInt(e.target.value) || 0)} />
        </Field>
      </Modal>
    </div>
  );
}

function describeFreq(f: { type: string; timesPerDay: number; weekdays?: number[]; intervalDays?: number; times: string[] }): string {
  if (f.type === 'daily') return `每日 ${f.timesPerDay} 次（${f.times.join('、')}）`;
  if (f.type === 'weekly') return `每周 ${f.weekdays?.length ?? 0} 天 · 每天 ${f.timesPerDay} 次`;
  if (f.type === 'interval') return `每 ${f.intervalDays ?? 1} 天 · 每天 ${f.timesPerDay} 次`;
  return '';
}
