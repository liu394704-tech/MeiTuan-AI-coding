import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Select, TextInput } from '@/components/ui/Input';
import { Tag } from '@/components/ui/Tag';
import { DoseItem } from '@/components/domain/DoseItem';
import { SpeakButton } from '@/components/domain/SpeakButton';
import { useTodayDoses } from '@/hooks/useTodayDoses';
import { useAppStore } from '@/store';
import { dayjs, fmtTime } from '@/utils/date';
import {
  buildDosesIcs,
  buildFollowUpIcs,
  downloadFile,
  shareToFamily,
} from '@/utils/share';

type Tab = 'today' | 'followup';

export function Reminders() {
  const doses = useTodayDoses();
  const events = useAppStore((s) => s.events);
  const meds = useAppStore((s) => s.medications);
  const followUps = useAppStore((s) => s.followUps);
  const addFollowUp = useAppStore((s) => s.addFollowUp);
  const updateFollowUp = useAppStore((s) => s.updateFollowUp);
  const removeFollowUp = useAppStore((s) => s.removeFollowUp);

  const [tab, setTab] = useState<Tab>('today');
  const [tip, setTip] = useState<string | null>(null);

  const upcoming = useMemo(
    () => followUps.filter((f) => f.status === 'upcoming').sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)),
    [followUps]
  );
  const past = useMemo(
    () => followUps.filter((f) => f.status !== 'upcoming').sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate)),
    [followUps]
  );

  const taken = doses.filter((d) => d.effectiveStatus === 'taken').length;
  const total = doses.length;

  const groups = useMemo(() => {
    const buckets: Record<string, typeof doses> = { 上午: [], 中午: [], 下午: [], 晚上: [] };
    for (const d of doses) {
      const h = dayjs(d.scheduledAt).hour();
      const key = h < 11 ? '上午' : h < 14 ? '中午' : h < 18 ? '下午' : '晚上';
      buckets[key].push(d);
    }
    return buckets;
  }, [doses]);

  const broadcastText = (() => {
    const next = doses.find((d) => d.effectiveStatus === 'pending');
    let txt = `今日共 ${total} 次服药，已完成 ${taken} 次。`;
    if (next) txt += `下一次：${fmtTime(next.scheduledAt)} 服 ${next.medicationName} ${next.dosage}${next.unit}。`;
    if (upcoming[0]) {
      const days = dayjs(upcoming[0].scheduledDate).diff(dayjs(), 'day');
      txt += `下一次复诊在 ${days <= 0 ? '今天' : `${days} 天后`}，${upcoming[0].hospital ?? ''}。`;
    }
    return txt;
  })();

  function exportDoseIcs() {
    const medMap = new Map(meds.map((m) => [m.id, { name: m.name, spec: m.spec }]));
    downloadFile('chronic-med-doses.ics', buildDosesIcs({ events, medMap }));
    setTip('日历文件已下载，请用日历 App 导入');
    setTimeout(() => setTip(null), 2200);
  }

  async function shareSummary() {
    const r = await shareToFamily({ title: '我的提醒', text: broadcastText });
    setTip(r === 'shared' ? '已分享' : r === 'copied' ? '已复制，可粘贴到家庭群' : '分享失败');
    setTimeout(() => setTip(null), 2200);
  }

  const [open, setOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(dayjs().add(14, 'day').format('YYYY-MM-DD'));
  const [hospital, setHospital] = useState('');
  const [department, setDepartment] = useState('');
  const [doctor, setDoctor] = useState('');
  const [reason, setReason] = useState('');
  const [relatedMedicationId, setRelatedMedicationId] = useState<string>('');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">提醒中心</h2>
          <p className="text-ink-500 mt-1">
            今日服药 <span className="font-semibold">{taken}/{total}</span> · 即将复诊{' '}
            <span className="font-semibold">{upcoming.length}</span> 项
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <SpeakButton text={broadcastText} label="🔊 播报" />
          <Button variant="secondary" size="lg" onClick={exportDoseIcs}>📅 同步日历</Button>
          <Button variant="secondary" size="lg" onClick={shareSummary}>👨‍👩‍👧 分享给家人</Button>
        </div>
      </div>

      {tip && (
        <div className="rounded-xl px-4 py-3 bg-brand-50 border border-brand-200 text-center text-ink-700 font-medium">
          {tip}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { id: 'today', label: `⏰ 今日服药 · ${total - taken} 待办` },
          { id: 'followup', label: `🩺 复诊提醒 · ${upcoming.length} 项` },
        ] as Array<{ id: Tab; label: string }>).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${
              tab === t.id
                ? 'bg-brand-500 text-ink-900 shadow-glow'
                : 'bg-white border border-brand-200 text-ink-700'
            }`}
            style={{ minHeight: 56 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TODAY TAB */}
      {tab === 'today' && (
        <div className="space-y-5">
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
      )}

      {/* FOLLOWUP TAB */}
      {tab === 'followup' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <Button size="lg" onClick={() => setOpen(true)}>+ 新建复诊</Button>
          </div>

          {upcoming.length === 0 ? (
            <Card>
              <p className="text-ink-500">暂无即将复诊的安排。</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcoming.map((f) => {
                const days = dayjs(f.scheduledDate).diff(dayjs(), 'day');
                return (
                  <Card key={f.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{f.scheduledDate}</h3>
                          {days <= 7 && days >= 0 && (
                            <Tag variant="warn">{days <= 0 ? '今天' : `${days} 天后`}</Tag>
                          )}
                          {f.autoGenerated && <Tag variant="info">自动生成</Tag>}
                        </div>
                        <p className="text-ink-700 mt-2">
                          {f.hospital} {f.department} {f.doctor && ` · ${f.doctor}`}
                        </p>
                        {f.reason && <p className="text-ink-500 text-sm mt-1">{f.reason}</p>}
                        {f.relatedMedicationIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {f.relatedMedicationIds.map((id) => {
                              const m = meds.find((x) => x.id === id);
                              return m ? <Tag key={id}>{m.name}</Tag> : null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 flex-wrap">
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => updateFollowUp(f.id, { status: 'done' })}
                      >
                        标记已完成
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() =>
                          downloadFile(`followup-${f.scheduledDate}.ics`, buildFollowUpIcs(f))
                        }
                      >
                        📅 加入日历
                      </Button>
                      <Button variant="ghost" size="lg" onClick={() => removeFollowUp(f.id)}>
                        删除
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-ink-700 mb-3">历史</h3>
              <div className="space-y-2">
                {past.map((f) => (
                  <div key={f.id} className="card flex items-center justify-between">
                    <div>
                      <div className="font-medium">{f.scheduledDate}</div>
                      <div className="text-sm text-ink-500">{f.hospital} {f.department}</div>
                    </div>
                    <Tag variant={f.status === 'done' ? 'success' : 'warn'}>
                      {f.status === 'done' ? '已完成' : '已取消'}
                    </Tag>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="新建复诊"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>取消</Button>
            <Button
              onClick={async () => {
                await addFollowUp({
                  scheduledDate,
                  hospital: hospital.trim() || undefined,
                  department: department.trim() || undefined,
                  doctor: doctor.trim() || undefined,
                  reason: reason.trim() || undefined,
                  relatedMedicationIds: relatedMedicationId ? [relatedMedicationId] : [],
                  status: 'upcoming',
                  autoGenerated: false,
                });
                setOpen(false);
                setReason('');
              }}
            >
              确认创建
            </Button>
          </>
        }
      >
        <Field label="复诊日期">
          <TextInput type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
        </Field>
        <Field label="医院">
          <TextInput value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder="北京协和" />
        </Field>
        <Field label="科室">
          <TextInput value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="心内科" />
        </Field>
        <Field label="医生（可选）">
          <TextInput value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder="张医生" />
        </Field>
        <Field label="事由（可选）">
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="复查血压 + 续方" />
        </Field>
        <Field label="关联药品（可选）">
          <Select value={relatedMedicationId} onChange={(e) => setRelatedMedicationId(e.target.value)}>
            <option value="">不关联</option>
            {meds.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        </Field>
      </Modal>
    </div>
  );
}
