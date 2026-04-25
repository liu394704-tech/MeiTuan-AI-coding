import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, NumberInput } from '@/components/ui/Input';
import { Tag } from '@/components/ui/Tag';
import { Modal } from '@/components/ui/Modal';
import { StockBar } from '@/components/domain/StockBar';
import { useAppStore } from '@/store';
import { useStockForecasts } from '@/hooks/useStockForecasts';
import { dayjs, fmtDateTime } from '@/utils/date';

export function MedicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const meds = useAppStore((s) => s.medications);
  const regs = useAppStore((s) => s.regimens);
  const events = useAppStore((s) => s.events);
  const inventories = useAppStore((s) => s.inventories);
  const restock = useAppStore((s) => s.restock);
  const remove = useAppStore((s) => s.removeMedication);
  const forecasts = useStockForecasts();

  const med = meds.find((m) => m.id === id);
  const reg = regs.find((r) => r.medicationId === id);
  const inv = inventories.find((i) => i.medicationId === id);
  const fc = forecasts.find((f) => f.medicationId === id);

  const recent = useMemo(() => {
    return events
      .filter((e) => e.medicationId === id)
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
      .slice(0, 14);
  }, [events, id]);

  const [restockOpen, setRestockOpen] = useState(false);
  const [restockAmt, setRestockAmt] = useState<number>(30);

  if (!med) {
    return (
      <Card>
        <p className="text-ink-500">未找到该药品。</p>
        <Link to="/medications">
          <Button className="mt-4">返回</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            {med.name}
            <Tag variant="info">{med.purpose}</Tag>
          </h2>
          <p className="text-ink-500 mt-1">{med.spec}</p>
        </div>
        <Button
          variant="danger"
          size="lg"
          onClick={async () => {
            if (confirm(`确定删除"${med.name}"吗？相关用药与库存数据将一起移除。`)) {
              await remove(med.id);
              navigate('/medications');
            }
          }}
        >
          删除
        </Button>
      </div>

      <Card title="用药方案">
        {reg ? (
          <ul className="space-y-2 text-ink-700">
            <li>
              频率：<b>{describeFreq(reg.frequency)}</b>
            </li>
            <li>
              单次：<b>{reg.dosage}{reg.unit}</b>
            </li>
            <li>方式：{labelWithFood(reg.withFood)}</li>
            {reg.notes && <li>备注：{reg.notes}</li>}
            <li>开始日期：{med.startDate}</li>
            {med.prescribedBy && <li>开方：{med.prescribedBy}</li>}
          </ul>
        ) : (
          <p className="text-ink-500">尚未配置用药方案。</p>
        )}
      </Card>

      <Card
        title="库存"
        action={
          <Button size="lg" onClick={() => setRestockOpen(true)}>
            + 补药
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="text-3xl font-bold">
            {inv?.quantity ?? 0}
            <span className="text-base font-normal text-ink-500"> {inv?.unit ?? med.unit}</span>
          </div>
          {fc && (
            <StockBar
              daysLeft={fc.daysLeft}
              threshold={inv?.lowStockThresholdDays ?? 3}
              max={Math.max(30, fc.daysLeft + 5)}
            />
          )}
          {inv?.lastRestockedAt && (
            <p className="text-sm text-ink-500">
              上次补药：{inv.lastRestockedAt}（+{inv.lastRestockAmount}）
            </p>
          )}
        </div>
      </Card>

      <Card title="近期记录">
        {recent.length === 0 ? (
          <p className="text-ink-500">暂无记录。</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {recent.map((e) => (
              <li key={e.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{fmtDateTime(e.scheduledAt)}</div>
                  <div className="text-sm text-ink-500">
                    剂量 {e.dosage}
                    {e.unit}
                  </div>
                </div>
                <div>
                  {e.status === 'taken' && <Tag variant="success">已服</Tag>}
                  {e.status === 'missed' && <Tag variant="danger">漏服</Tag>}
                  {e.status === 'skipped' && <Tag variant="warn">跳过</Tag>}
                  {e.status === 'pending' &&
                    (dayjs(e.scheduledAt).isAfter(dayjs()) ? (
                      <Tag variant="info">待服</Tag>
                    ) : (
                      <Tag variant="danger">已超时</Tag>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={restockOpen}
        onClose={() => setRestockOpen(false)}
        title="补充库存"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRestockOpen(false)}>
              取消
            </Button>
            <Button
              onClick={async () => {
                await restock(med.id, restockAmt);
                setRestockOpen(false);
              }}
            >
              确认补药
            </Button>
          </>
        }
      >
        <Field label={`本次补药数量（${med.unit}）`}>
          <NumberInput
            value={restockAmt}
            min={1}
            onChange={(e) => setRestockAmt(parseInt(e.target.value) || 0)}
          />
        </Field>
      </Modal>
    </div>
  );
}

function describeFreq(f: { type: string; timesPerDay: number; weekdays?: number[]; intervalDays?: number; times: string[] }): string {
  if (f.type === 'daily') return `每日 ${f.timesPerDay} 次（${f.times.join('、')}）`;
  if (f.type === 'weekly') return `每周 ${f.weekdays?.length ?? 0} 天 · 每天 ${f.timesPerDay} 次（${f.times.join('、')}）`;
  if (f.type === 'interval') return `每 ${f.intervalDays ?? 1} 天 · 每天 ${f.timesPerDay} 次（${f.times.join('、')}）`;
  return '';
}

function labelWithFood(w: string): string {
  return { before: '饭前', with: '随餐', after: '饭后', any: '不限' }[w as 'before'] ?? '不限';
}
