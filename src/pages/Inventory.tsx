import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, NumberInput } from '@/components/ui/Input';
import { Tag } from '@/components/ui/Tag';
import { StockBar } from '@/components/domain/StockBar';
import { useStockForecasts } from '@/hooks/useStockForecasts';
import { useAppStore } from '@/store';

export function Inventory() {
  const fc = useStockForecasts();
  const inventories = useAppStore((s) => s.inventories);
  const restock = useAppStore((s) => s.restock);
  const setThreshold = useAppStore((s) => s.setThreshold);

  const [restockId, setRestockId] = useState<string | null>(null);
  const [amount, setAmount] = useState(30);

  const lowList = fc.filter((x) => x.isLow);
  const shoppingList = useMemo(
    () =>
      lowList
        .map(
          (x) =>
            `${x.name} ${x.spec} - 建议补充 ${Math.max(
              30,
              Math.ceil(x.perDay * 30)
            )} ${x.unit}`
        )
        .join('\n'),
    [lowList]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold">库存管理</h2>
        <p className="text-ink-500 mt-1">
          预警 {lowList.length} 项 / 共 {fc.length} 项
        </p>
      </div>

      {lowList.length > 0 && (
        <Card title="📦 购药清单" action={<CopyButton text={shoppingList} />}>
          <pre className="bg-ink-100 rounded-lg p-3 text-sm whitespace-pre-wrap font-sans">
            {shoppingList}
          </pre>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fc.map((x) => {
          const inv = inventories.find((i) => i.medicationId === x.medicationId);
          return (
            <Card key={x.medicationId}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base md:text-lg">{x.name}</h3>
                    {x.isLow && (
                      <Tag variant={x.daysLeft <= 1 ? 'danger' : 'warn'}>
                        {x.daysLeft <= 1 ? '紧急' : '即将耗尽'}
                      </Tag>
                    )}
                  </div>
                  <p className="text-sm text-ink-500 mt-1">{x.spec}</p>
                </div>
                <Button size="lg" onClick={() => { setRestockId(x.medicationId); setAmount(30); }}>
                  + 补药
                </Button>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink-500">当前库存</span>
                  <span className="font-semibold">
                    {x.quantity} {x.unit}
                  </span>
                </div>
                <StockBar
                  daysLeft={x.daysLeft}
                  threshold={inv?.lowStockThresholdDays ?? 3}
                  max={Math.max(30, x.daysLeft + 5)}
                />
                <p className="text-xs text-ink-500 mt-2">
                  日均消耗 ≈ {x.perDay.toFixed(2)} {x.unit}/天
                </p>
              </div>

              {inv && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-ink-500">预警阈值：</span>
                  <NumberInput
                    value={inv.lowStockThresholdDays}
                    min={1}
                    className="w-24"
                    onChange={(e) => setThreshold(x.medicationId, parseInt(e.target.value) || 3)}
                  />
                  <span className="text-sm text-ink-500">天</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Modal
        open={!!restockId}
        onClose={() => setRestockId(null)}
        title="补充库存"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRestockId(null)}>
              取消
            </Button>
            <Button
              onClick={async () => {
                if (restockId) {
                  await restock(restockId, amount);
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
          <NumberInput value={amount} min={1} onChange={(e) => setAmount(parseInt(e.target.value) || 0)} />
        </Field>
      </Modal>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore
        }
      }}
    >
      {copied ? '已复制 ✓' : '复制清单'}
    </Button>
  );
}
