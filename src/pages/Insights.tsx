import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, NumberInput, Select, TextInput, Textarea } from '@/components/ui/Input';
import { Tag } from '@/components/ui/Tag';
import { SpeakButton } from '@/components/domain/SpeakButton';
import { useAppStore } from '@/store';
import { dayjs } from '@/utils/date';
import { computeHealthScore, generateRecommendations, type SubScore } from '@/utils/healthScore';
import type { VitalKind } from '@/types';

const KIND_LABEL: Record<VitalKind, { label: string; emoji: string; unit: string }> = {
  blood_pressure: { label: '血压', emoji: '🩸', unit: 'mmHg' },
  blood_glucose: { label: '空腹血糖', emoji: '🍬', unit: 'mmol/L' },
  heart_rate: { label: '心率', emoji: '❤️', unit: 'bpm' },
  weight: { label: '体重', emoji: '⚖️', unit: 'kg' },
  steps: { label: '步数', emoji: '👟', unit: '步' },
  sleep_hours: { label: '睡眠', emoji: '😴', unit: '小时' },
};

const VERDICT_COLOR = {
  good: { ring: '#22A06B', tag: 'success' as const, text: '健康状态良好' },
  fair: { ring: '#F0AD4E', tag: 'warn' as const, text: '需要关注' },
  poor: { ring: '#E5484D', tag: 'danger' as const, text: '需要重点干预' },
};

export function Insights() {
  const user = useAppStore((s) => s.user);
  const events = useAppStore((s) => s.events);
  const vitals = useAppStore((s) => s.vitals);
  const reports = useAppStore((s) => s.reports);
  const addVital = useAppStore((s) => s.addVital);
  const removeVital = useAppStore((s) => s.removeVital);
  const addReport = useAppStore((s) => s.addReport);
  const removeReport = useAppStore((s) => s.removeReport);

  const score = useMemo(
    () => computeHealthScore({ user, events, vitals, reports }),
    [user, events, vitals, reports]
  );
  const recs = useMemo(
    () => generateRecommendations(score, user?.conditions ?? []),
    [score, user]
  );

  // 趋势：血压 14 天平均 + 血糖 14 天
  const bpTrend = useMemo(() => {
    const map = new Map<string, { sys: number[]; dia: number[] }>();
    for (const v of vitals) {
      if (v.kind !== 'blood_pressure') continue;
      const d = dayjs(v.measuredAt).format('MM-DD');
      if (!map.has(d)) map.set(d, { sys: [], dia: [] });
      map.get(d)!.sys.push(v.value);
      if (v.value2) map.get(d)!.dia.push(v.value2);
    }
    return Array.from(map.entries())
      .map(([day, x]) => ({
        day,
        sys: Math.round(x.sys.reduce((a, b) => a + b, 0) / x.sys.length),
        dia: Math.round(x.dia.reduce((a, b) => a + b, 0) / Math.max(1, x.dia.length)),
      }))
      .slice(-14);
  }, [vitals]);

  const bgTrend = useMemo(() => {
    return vitals
      .filter((v) => v.kind === 'blood_glucose')
      .map((v) => ({
        day: dayjs(v.measuredAt).format('MM-DD'),
        value: v.value,
      }))
      .slice(-14);
  }, [vitals]);

  const [vitalOpen, setVitalOpen] = useState(false);
  const [vitalKind, setVitalKind] = useState<VitalKind>('blood_pressure');
  const [vitalValue, setVitalValue] = useState<number>(120);
  const [vitalValue2, setVitalValue2] = useState<number>(80);
  const [vitalCtx, setVitalCtx] = useState('');

  const [reportOpen, setReportOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportHospital, setReportHospital] = useState('');
  const [reportDate, setReportDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [reportConclusion, setReportConclusion] = useState('');
  const [reportHighlights, setReportHighlights] = useState('LDL 低密度脂蛋白:3.4 mmol/L:high\nHbA1c 糖化血红蛋白:7.0 %:high');

  const broadcastText = (() => {
    const sub = score.subs.map((s) => `${s.label} ${s.score} 分`).join('，');
    const top = recs[0];
    return `综合健康分 ${score.overall} 分。${VERDICT_COLOR[score.verdict].text}。${sub}。最重要的一条建议：${top?.title ?? ''}。${top?.body ?? ''}`;
  })();

  function recentVitalCard(kind: VitalKind) {
    const k = KIND_LABEL[kind];
    const list = vitals.filter((v) => v.kind === kind).sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
    const latest = list[0];
    return (
      <div className="rounded-xl border border-brand-200 bg-white px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{k.emoji}</span>
          <span className="text-sm text-ink-500">{k.label}</span>
        </div>
        {latest ? (
          <>
            <div className="text-xl font-bold text-ink-900 mt-1">
              {kind === 'blood_pressure' ? `${latest.value}/${latest.value2}` : latest.value}
              <span className="ml-1 text-xs font-normal text-ink-500">{latest.unit}</span>
            </div>
            <div className="text-xs text-ink-500 mt-0.5">
              {dayjs(latest.measuredAt).format('MM-DD HH:mm')}
              {latest.context ? ` · ${latest.context}` : ''}
            </div>
          </>
        ) : (
          <div className="text-sm text-ink-500 mt-2">暂无记录</div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">AI 健康助手</h2>
          <p className="text-ink-500 mt-1">综合用药、生理指标、生活方式与体检报告，给出整体评分与个性化建议</p>
        </div>
        <SpeakButton text={broadcastText} label="🔊 语音播报" />
      </div>

      {/* 1. 综合健康评分 */}
      <section className="rounded-xl2 shadow-soft border border-brand-200 bg-white overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-0">
          <div className="bg-brand-50 p-5 md:p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-brand-200">
            <ScoreRing score={score.overall} verdict={score.verdict} />
            <div className="mt-3">
              <Tag variant={VERDICT_COLOR[score.verdict].tag}>{VERDICT_COLOR[score.verdict].text}</Tag>
            </div>
            <div className="text-xs text-ink-500 mt-2">
              更新于 {dayjs(score.asOf).format('MM-DD HH:mm')}
            </div>
          </div>
          <div className="p-5 md:p-6">
            <div className="text-sm text-ink-500 mb-3">分维度评分</div>
            <div className="grid grid-cols-2 gap-3">
              {score.subs.map((s) => (
                <SubScoreCard key={s.key} sub={s} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. 个性化建议 */}
      <Card title="今日个性化建议">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recs.map((r, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border ${
                r.priority === 1
                  ? 'border-brand-300 bg-brand-50/70'
                  : 'border-brand-100 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl">{r.emoji}</span>
                <Tag>{r.category}</Tag>
                {r.priority === 1 && <Tag variant="warn">优先</Tag>}
              </div>
              <h4 className="font-semibold text-ink-900 mt-2">{r.title}</h4>
              <p className="text-sm text-ink-700 mt-1 leading-relaxed">{r.body}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* 3. 生理数据 */}
      <Card
        title="生理指标"
        action={
          <Button size="lg" onClick={() => setVitalOpen(true)}>
            + 录入
          </Button>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {(['blood_pressure', 'blood_glucose', 'heart_rate', 'weight', 'steps', 'sleep_hours'] as VitalKind[]).map(
            (k) => (
              <div key={k}>{recentVitalCard(k)}</div>
            )
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {bpTrend.length > 0 && (
            <div>
              <div className="text-sm text-ink-500 mb-2">血压趋势（近 14 天均值）</div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bpTrend} margin={{ left: 0, right: 12, top: 5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="day" stroke="#64748B" />
                    <YAxis stroke="#64748B" />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }} />
                    <Line type="monotone" dataKey="sys" stroke="#E5484D" name="收缩压" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="dia" stroke="#1F6FEB" name="舒张压" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {bgTrend.length > 0 && (
            <div>
              <div className="text-sm text-ink-500 mb-2">空腹血糖趋势（近 14 天）</div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bgTrend} margin={{ left: 0, right: 12, top: 5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="day" stroke="#64748B" />
                    <YAxis stroke="#64748B" />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }} />
                    <Line type="monotone" dataKey="value" stroke="#E0AC00" name="mmol/L" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 4. 体检报告 */}
      <Card
        title="体检报告"
        action={
          <Button size="lg" onClick={() => setReportOpen(true)}>
            + 上传
          </Button>
        }
      >
        {reports.length === 0 ? (
          <p className="text-ink-500">暂无报告，可手动录入关键指标，AI 助手会一起综合分析。</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="border border-brand-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-ink-900">{r.title}</div>
                    <div className="text-sm text-ink-500 mt-0.5">
                      {r.reportDate} · {r.hospital ?? ''}
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => { if (confirm('删除该报告？')) removeReport(r.id); }}>
                    删除
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {r.highlights.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-ink-100/60"
                    >
                      <span className="text-sm text-ink-700">{h.label}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold">{h.value}</span>
                        {h.level === 'high' && <Tag variant="danger">偏高</Tag>}
                        {h.level === 'low' && <Tag variant="warn">偏低</Tag>}
                        {h.level === 'normal' && <Tag variant="success">正常</Tag>}
                      </span>
                    </div>
                  ))}
                </div>
                {r.conclusion && (
                  <p className="text-sm text-ink-700 mt-3 leading-relaxed">医师结论：{r.conclusion}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 5. 历史录入 */}
      {vitals.length > 0 && (
        <Card title="最近录入">
          <ul className="divide-y divide-brand-100">
            {vitals
              .slice()
              .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
              .slice(0, 8)
              .map((v) => {
                const k = KIND_LABEL[v.kind];
                return (
                  <li key={v.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg">{k.emoji}</span>
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {k.label}：{v.kind === 'blood_pressure' ? `${v.value}/${v.value2}` : v.value} {v.unit}
                          {v.context ? <span className="ml-1 text-xs text-ink-500">· {v.context}</span> : null}
                        </div>
                        <div className="text-xs text-ink-500">{dayjs(v.measuredAt).format('MM-DD HH:mm')}</div>
                      </div>
                    </div>
                    <Button variant="ghost" onClick={() => removeVital(v.id)}>删除</Button>
                  </li>
                );
              })}
          </ul>
        </Card>
      )}

      <p className="text-xs text-ink-500 text-center pt-4">
        本助手由规则引擎驱动，结果仅供生活管理参考，不构成医疗建议。
      </p>

      {/* Add vital modal */}
      <Modal
        open={vitalOpen}
        onClose={() => setVitalOpen(false)}
        title="录入生理指标"
        footer={
          <>
            <Button variant="ghost" onClick={() => setVitalOpen(false)}>取消</Button>
            <Button
              onClick={async () => {
                const k = KIND_LABEL[vitalKind];
                await addVital({
                  kind: vitalKind,
                  value: vitalValue,
                  value2: vitalKind === 'blood_pressure' ? vitalValue2 : undefined,
                  unit: k.unit,
                  context: vitalCtx.trim() || undefined,
                  measuredAt: dayjs().toISOString(),
                  source: 'manual',
                });
                setVitalOpen(false);
                setVitalCtx('');
              }}
            >
              保存
            </Button>
          </>
        }
      >
        <Field label="指标类型">
          <Select value={vitalKind} onChange={(e) => setVitalKind(e.target.value as VitalKind)}>
            {(Object.keys(KIND_LABEL) as VitalKind[]).map((k) => (
              <option key={k} value={k}>{KIND_LABEL[k].emoji} {KIND_LABEL[k].label}</option>
            ))}
          </Select>
        </Field>
        {vitalKind === 'blood_pressure' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="收缩压 (高压)">
              <NumberInput value={vitalValue} onChange={(e) => setVitalValue(parseInt(e.target.value) || 0)} />
            </Field>
            <Field label="舒张压 (低压)">
              <NumberInput value={vitalValue2} onChange={(e) => setVitalValue2(parseInt(e.target.value) || 0)} />
            </Field>
          </div>
        ) : (
          <Field label={`数值（${KIND_LABEL[vitalKind].unit}）`}>
            <NumberInput
              value={vitalValue}
              step={vitalKind === 'blood_glucose' || vitalKind === 'sleep_hours' ? 0.1 : 1}
              onChange={(e) => setVitalValue(parseFloat(e.target.value) || 0)}
            />
          </Field>
        )}
        <Field label="上下文（可选）" hint="例如：空腹、餐后2小时、运动后">
          <TextInput value={vitalCtx} onChange={(e) => setVitalCtx(e.target.value)} />
        </Field>
      </Modal>

      {/* Upload report modal */}
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="上传体检报告"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>取消</Button>
            <Button
              onClick={async () => {
                if (!reportTitle.trim()) return;
                const highlights = reportHighlights
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => {
                    const [label, value, level] = line.split(':').map((x) => x.trim());
                    return {
                      label: label ?? '',
                      value: value ?? '',
                      level: (level as 'high' | 'low' | 'normal') ?? 'normal',
                    };
                  });
                await addReport({
                  title: reportTitle.trim(),
                  hospital: reportHospital.trim() || undefined,
                  reportDate,
                  conclusion: reportConclusion.trim() || undefined,
                  highlights,
                });
                setReportOpen(false);
                setReportTitle('');
                setReportConclusion('');
                setReportHighlights('LDL 低密度脂蛋白:3.4 mmol/L:high');
              }}
            >
              保存
            </Button>
          </>
        }
      >
        <Field label="报告名称">
          <TextInput value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} placeholder="例如：年度体检" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="医院">
            <TextInput value={reportHospital} onChange={(e) => setReportHospital(e.target.value)} placeholder="北京协和" />
          </Field>
          <Field label="报告日期">
            <TextInput type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          </Field>
        </div>
        <Field
          label="关键指标"
          hint="每行一项，格式：指标:值:级别（high / low / normal），例如 LDL:3.4 mmol/L:high"
        >
          <Textarea rows={4} value={reportHighlights} onChange={(e) => setReportHighlights(e.target.value)} />
        </Field>
        <Field label="医师结论（可选）">
          <Textarea rows={2} value={reportConclusion} onChange={(e) => setReportConclusion(e.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}

function ScoreRing({ score, verdict }: { score: number; verdict: 'good' | 'fair' | 'poor' }) {
  const size = 170;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;
  const color = VERDICT_COLOR[verdict].ring;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#FFE9A8" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="50%" y="42%" textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="#7A6F5C">
        综合健康分
      </text>
      <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" fontSize="42" fontWeight="800" fill="#1A1300">
        {score}
      </text>
    </svg>
  );
}

function SubScoreCard({ sub }: { sub: SubScore }) {
  const v = sub.verdict;
  const color = v === 'good' ? 'text-success' : v === 'fair' ? 'text-warning' : 'text-danger';
  const bar = v === 'good' ? 'bg-success' : v === 'fair' ? 'bg-warning' : 'bg-danger';
  return (
    <div className="p-3 rounded-xl bg-white border border-brand-100">
      <div className="flex items-center gap-2">
        <span className="text-xl">{sub.emoji}</span>
        <span className="text-sm text-ink-700 font-medium">{sub.label}</span>
        <span className={`ml-auto text-xl font-bold ${color}`}>{sub.score}</span>
      </div>
      <div className="h-1.5 rounded-full bg-ink-100 mt-2 overflow-hidden">
        <div className={`h-full ${bar} transition-all`} style={{ width: `${sub.score}%` }} />
      </div>
      <p className="text-xs text-ink-500 mt-2 line-clamp-2">{sub.detail}</p>
    </div>
  );
}
