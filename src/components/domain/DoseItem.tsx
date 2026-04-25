import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { fmtTime } from '@/utils/date';
import { useAppStore } from '@/store';
import type { TodayDose } from '@/hooks/useTodayDoses';

export function DoseItem({ dose }: { dose: TodayDose }) {
  const take = useAppStore((s) => s.takeDose);
  const skip = useAppStore((s) => s.skipDose);
  const revert = useAppStore((s) => s.revertDose);

  const status = dose.effectiveStatus;
  const isDone = status === 'taken' || status === 'skipped';

  return (
    <div
      className={`card flex flex-col md:flex-row md:items-center gap-4 transition-colors ${
        status === 'taken'
          ? 'bg-emerald-50/60 border border-emerald-100'
          : status === 'missed'
          ? 'bg-red-50/40 border border-red-100'
          : status === 'skipped'
          ? 'bg-ink-100/60'
          : ''
      }`}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-16 h-16 rounded-xl bg-brand-50 text-brand-600 flex flex-col items-center justify-center font-bold shrink-0">
          <div className="text-xs">服药</div>
          <div className="text-lg leading-none">{fmtTime(dose.scheduledAt)}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-base md:text-lg font-semibold text-ink-900 truncate">
              {dose.medicationName}
            </h4>
            {status === 'taken' && <Tag variant="success">已服</Tag>}
            {status === 'missed' && <Tag variant="danger">已超时</Tag>}
            {status === 'skipped' && <Tag variant="warn">已跳过</Tag>}
            {status === 'pending' && <Tag variant="info">待服</Tag>}
          </div>
          <p className="text-sm text-ink-500 mt-1">
            {dose.spec} · 单次 {dose.dosage} {dose.unit}
          </p>
        </div>
      </div>

      <div className="flex gap-2 md:gap-3 shrink-0">
        {!isDone && (
          <>
            <Button size="lg" onClick={() => take(dose.id)} aria-label="标记已服">
              ✓ 已服药
            </Button>
            <Button variant="ghost" size="lg" onClick={() => skip(dose.id)} aria-label="跳过">
              跳过
            </Button>
          </>
        )}
        {isDone && (
          <Button variant="secondary" size="lg" onClick={() => revert(dose.id)} aria-label="撤销">
            ↺ 撤销
          </Button>
        )}
      </div>
    </div>
  );
}
