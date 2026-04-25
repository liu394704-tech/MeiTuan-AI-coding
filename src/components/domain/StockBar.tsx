interface StockBarProps {
  daysLeft: number;
  threshold: number;
  max?: number; // visualization upper bound
}

export function StockBar({ daysLeft, threshold, max = 30 }: StockBarProps) {
  const safe = Math.min(max, Math.max(0, isFinite(daysLeft) ? daysLeft : max));
  const pct = (safe / max) * 100;
  const color = daysLeft <= 1 ? 'bg-danger' : daysLeft <= threshold ? 'bg-warning' : 'bg-success';
  return (
    <div>
      <div className="flex justify-between text-sm text-ink-500 mb-1">
        <span>剩余可用</span>
        <span className="font-semibold text-ink-700">
          {isFinite(daysLeft) ? `${daysLeft} 天` : '充足'}
        </span>
      </div>
      <div className="h-3 rounded-full bg-ink-100 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
