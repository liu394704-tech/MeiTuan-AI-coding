import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Select, TextInput } from '@/components/ui/Input';
import { SpeakButton } from '@/components/domain/SpeakButton';
import { useAppStore } from '@/store';
import type { FamilyEventType, FamilyRole } from '@/types';
import { dayjs, fmtTime } from '@/utils/date';
import { shareToFamily } from '@/utils/share';
import { useStockForecasts } from '@/hooks/useStockForecasts';

const ROLE_LABEL: Record<FamilyRole, string> = {
  patient: '本人',
  guardian: '监护',
  doctor: '医生',
  other: '其他',
};

const SYSTEM_TYPES = new Set<FamilyEventType>(['dose_taken', 'low_stock', 'restock', 'follow_up']);

const QUICK_REPLIES = [
  '收到 👌',
  '记得按时吃药噢',
  '今天感觉怎么样？',
  '别忘了量血压',
  '周末回家看您 ❤️',
  '👍',
];

export function Family() {
  const family = useAppStore((s) => s.familyMembers);
  const feed = useAppStore((s) => s.familyFeed);
  const addMember = useAppStore((s) => s.addFamilyMember);
  const toggleNotify = useAppStore((s) => s.toggleFamilyNotify);
  const removeMember = useAppStore((s) => s.removeFamilyMember);
  const pushFeed = useAppStore((s) => s.pushFamilyFeed);
  const user = useAppStore((s) => s.user);
  const stocks = useStockForecasts();

  const me = family.find((m) => m.role === 'patient') ?? family[0];
  const others = family.filter((m) => m.id !== me?.id);

  // 当前"以谁的身份发送"，方便演示家人发消息（默认女儿）
  const [asMemberId, setAsMemberId] = useState(others[0]?.id ?? me?.id ?? 'fm_self');
  useEffect(() => {
    if (!asMemberId && others[0]) setAsMemberId(others[0].id);
  }, [asMemberId, others]);

  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('儿子');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<FamilyRole>('guardian');

  // chat list (ascending time)
  const messages = useMemo(
    () => [...feed].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [feed]
  );

  // auto scroll
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const lowStocks = stocks.filter((x) => x.isLow);
  const summaryText =
    `${user?.name ?? '本人'} 的健康简报：本周用药基本规律。` +
    (lowStocks.length > 0
      ? `以下药品库存不足：${lowStocks.map((s) => `${s.name}（仅够 ${s.daysLeft} 天）`).join('、')}。`
      : `所有药品库存充足。`);

  function send() {
    const msg = text.trim();
    if (!msg) return;
    pushFeed({
      type: 'cheer',
      title: msg,
      byMemberId: asMemberId,
    });
    setText('');
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">家庭健康群</h2>
          <p className="text-ink-500 mt-1">让全家人一起守护爸妈</p>
        </div>
        <div className="flex gap-2">
          <SpeakButton text={summaryText} label="🔊 播报简报" />
          <Button
            size="lg"
            onClick={async () => {
              const r = await shareToFamily({ title: '家庭健康简报', text: summaryText });
              alert(
                r === 'shared' ? '已通过系统分享' : r === 'copied' ? '简报已复制，可粘贴到家庭群' : '分享失败'
              );
            }}
          >
            🔗 分享到群
          </Button>
        </div>
      </div>

      {/* Chat layout */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
        {/* Sidebar: members */}
        <aside className="card !p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-brand-100 bg-brand-50/60">
            <div className="text-sm text-ink-500">家庭群成员</div>
            <div className="font-semibold">共 {family.length} 人</div>
          </div>
          <ul className="divide-y divide-brand-100 max-h-[60vh] md:max-h-[70vh] overflow-auto">
            {family.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                  style={{ background: m.avatarColor ?? '#FFC300' }}
                >
                  {m.name.slice(-1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-medium truncate">{m.name}</span>
                    {m.role === 'patient' && (
                      <span className="text-xs text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded">本人</span>
                    )}
                  </div>
                  <div className="text-xs text-ink-500">
                    {ROLE_LABEL[m.role]}{m.relation ? ` · ${m.relation}` : ''}
                  </div>
                </div>
                {m.role !== 'patient' && (
                  <input
                    type="checkbox"
                    title="接收提醒"
                    className="w-5 h-5 accent-brand-500 cursor-pointer"
                    checked={m.notify}
                    onChange={(e) => toggleNotify(m.id, e.target.checked)}
                  />
                )}
              </li>
            ))}
          </ul>
          <div className="p-3 border-t border-brand-100 flex flex-col gap-2">
            <Button variant="secondary" onClick={() => setOpen(true)}>+ 邀请家人</Button>
            {others.length > 1 && (
              <button
                onClick={() => {
                  if (confirm('移除最后一位家庭成员？')) removeMember(others[others.length - 1].id);
                }}
                className="text-xs text-ink-500 hover:text-danger"
                style={{ minHeight: 32 }}
              >
                移除最后一位成员
              </button>
            )}
          </div>
        </aside>

        {/* Chat panel */}
        <section
          className="rounded-xl2 shadow-soft border border-brand-100 overflow-hidden flex flex-col"
          style={{
            background:
              "linear-gradient(180deg, #F2EEE5 0%, #ECE7DA 100%)",
            minHeight: '60vh',
          }}
        >
          {/* Chat header */}
          <div className="px-4 py-3 bg-white/85 backdrop-blur border-b border-brand-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-500 text-ink-900 font-bold flex items-center justify-center">家</div>
              <div>
                <div className="font-semibold">家庭健康群（{family.length}）</div>
                <div className="text-xs text-ink-500">最近活跃 {dayjs(messages[messages.length - 1]?.createdAt ?? new Date()).format('MM-DD HH:mm')}</div>
              </div>
            </div>
            <div className="text-xs text-ink-500 hidden md:block">演示数据，本地保存</div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((m) => {
              if (m.type === 'system') {
                return (
                  <div key={m.id} className="flex justify-center">
                    <span className="px-3 py-1 rounded-full bg-black/10 text-xs text-ink-700">
                      {m.title}
                    </span>
                  </div>
                );
              }
              if (SYSTEM_TYPES.has(m.type) && m.type !== 'cheer') {
                const icon = m.type === 'dose_taken' ? '✅' : m.type === 'low_stock' ? '📦' : m.type === 'restock' ? '🛒' : '🩺';
                return (
                  <div key={m.id} className="flex justify-center">
                    <div className="bg-white/80 border border-brand-100 px-3 py-2 rounded-xl shadow-sm text-sm text-ink-700 max-w-[80%]">
                      <span className="mr-1.5">{icon}</span>{m.title}
                      <span className="ml-2 text-xs text-ink-500">{fmtTime(m.createdAt)}</span>
                    </div>
                  </div>
                );
              }
              const member = family.find((x) => x.id === m.byMemberId);
              const mine = member?.id === me?.id;
              return (
                <div key={m.id} className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                  {!mine && (
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: member?.avatarColor ?? '#FFC300' }}
                    >
                      {(member?.name ?? '？').slice(-1)}
                    </div>
                  )}
                  <div className={`max-w-[75%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!mine && (
                      <div className="text-xs text-ink-500 mb-0.5 px-1">
                        {member?.name ?? '匿名'}
                      </div>
                    )}
                    <div
                      className={`px-3.5 py-2.5 leading-relaxed shadow-sm ${
                        mine
                          ? 'bg-brand-400 text-ink-900 rounded-2xl rounded-tr-sm'
                          : 'bg-white text-ink-900 rounded-2xl rounded-tl-sm border border-brand-100'
                      }`}
                    >
                      {m.title}
                    </div>
                    <div className="text-[10px] text-ink-500 mt-0.5 px-1">{fmtTime(m.createdAt)}</div>
                  </div>
                  {mine && (
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: me?.avatarColor ?? '#FFC300' }}
                    >
                      {(me?.name ?? '我').slice(-1)}
                    </div>
                  )}
                </div>
              );
            })}
            {messages.length === 0 && (
              <div className="text-center text-ink-500 py-8">说一句关心的话开始群聊吧～</div>
            )}
          </div>

          {/* Quick replies */}
          <div className="px-3 py-2 bg-white/70 border-t border-brand-100 flex gap-2 overflow-x-auto">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => setText(q)}
                className="shrink-0 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-sm hover:bg-brand-100"
                style={{ minHeight: 36 }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input bar */}
          <div className="p-3 bg-white border-t border-brand-100 flex items-center gap-2">
            <Select
              value={asMemberId}
              onChange={(e) => setAsMemberId(e.target.value)}
              className="!min-h-[44px] !py-2 !w-32 shrink-0"
              title="以谁的身份发送（演示用）"
            >
              {family.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
            <TextInput
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="说点什么…"
              className="!min-h-[44px] !py-2"
            />
            <Button onClick={send} className="shrink-0">发送</Button>
          </div>
        </section>
      </div>

      {/* Add member modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="邀请家人"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>取消</Button>
            <Button
              onClick={async () => {
                if (!name.trim()) return;
                await addMember({
                  name: name.trim(),
                  role,
                  relation,
                  phone: phone.trim() || undefined,
                  notify: true,
                  avatarColor: ['#FF8C00', '#22A06B', '#1F6FEB', '#E5484D', '#9C5BD3'][family.length % 5],
                });
                setName('');
                setPhone('');
                setRole('guardian');
                setRelation('儿子');
                setOpen(false);
              }}
            >
              添加
            </Button>
          </>
        }
      >
        <Field label="姓名">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：小王" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="关系">
            <Select value={relation} onChange={(e) => setRelation(e.target.value)}>
              {['儿子', '女儿', '配偶', '孙辈', '其他'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </Field>
          <Field label="角色">
            <Select value={role} onChange={(e) => setRole(e.target.value as FamilyRole)}>
              <option value="guardian">监护人</option>
              <option value="doctor">医生</option>
              <option value="other">其他</option>
            </Select>
          </Field>
        </div>
        <Field label="手机号（可选）">
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="138****0001" />
        </Field>
      </Modal>
    </div>
  );
}
