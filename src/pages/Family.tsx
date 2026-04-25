import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Select, TextInput } from '@/components/ui/Input';
import { Tag } from '@/components/ui/Tag';
import { SpeakButton } from '@/components/domain/SpeakButton';
import { useAppStore } from '@/store';
import type { FamilyEventType, FamilyRole } from '@/types';
import { dayjs } from '@/utils/date';
import { shareToFamily } from '@/utils/share';
import { useStockForecasts } from '@/hooks/useStockForecasts';

const ROLE_LABEL: Record<FamilyRole, string> = {
  patient: '本人',
  guardian: '监护人',
  doctor: '医生',
  other: '其他',
};

const FEED_ICON: Record<FamilyEventType, string> = {
  dose_taken: '✅',
  dose_missed: '❗',
  low_stock: '📦',
  restock: '🛒',
  follow_up: '🩺',
  cheer: '❤️',
};

export function Family() {
  const family = useAppStore((s) => s.familyMembers);
  const feed = useAppStore((s) => s.familyFeed);
  const addMember = useAppStore((s) => s.addFamilyMember);
  const toggleNotify = useAppStore((s) => s.toggleFamilyNotify);
  const removeMember = useAppStore((s) => s.removeFamilyMember);
  const pushFeed = useAppStore((s) => s.pushFamilyFeed);
  const user = useAppStore((s) => s.user);
  const stocks = useStockForecasts();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('儿子');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<FamilyRole>('guardian');

  const [cheerOpen, setCheerOpen] = useState(false);
  const [cheerText, setCheerText] = useState('记得按时吃药噢！我们都很爱您 ❤️');

  const [shareTip, setShareTip] = useState<string | null>(null);

  const lowStocks = stocks.filter((x) => x.isLow);
  const summaryText =
    `${user?.name ?? '本人'} 的健康简报：` +
    `本周用药基本规律。` +
    (lowStocks.length > 0
      ? `以下药品库存不足，请尽快补药：${lowStocks
          .map((s) => `${s.name}（仅够 ${s.daysLeft} 天）`)
          .join('、')}。`
      : `所有药品库存充足。`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">家庭健康群</h2>
          <p className="text-ink-500 mt-1">让全家人一起守护爸妈的健康</p>
        </div>
        <div className="flex gap-2">
          <SpeakButton text={summaryText} label="向音箱播报简报" />
          <Button
            size="lg"
            onClick={async () => {
              const r = await shareToFamily({
                title: '家庭健康简报',
                text: summaryText,
              });
              setShareTip(
                r === 'shared' ? '已通过系统分享' : r === 'copied' ? '简报已复制，可粘贴到家庭群' : '分享失败'
              );
              setTimeout(() => setShareTip(null), 2200);
            }}
          >
            🔗 分享到家庭群
          </Button>
        </div>
      </div>

      {shareTip && (
        <div className="card-yellow text-center font-medium">{shareTip}</div>
      )}

      {/* Members */}
      <Card
        title="家庭成员"
        action={
          <Button size="lg" onClick={() => setOpen(true)}>
            + 邀请家人
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {family.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-brand-50/60 border border-brand-100"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ background: m.avatarColor ?? '#FFC300' }}
              >
                {m.name.slice(-1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{m.name}</span>
                  <Tag>{ROLE_LABEL[m.role]}</Tag>
                  {m.relation && <span className="text-sm text-ink-500">· {m.relation}</span>}
                </div>
                {m.phone && <div className="text-sm text-ink-500 mt-0.5">{m.phone}</div>}
              </div>
              {m.role !== 'patient' && (
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-sm text-ink-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 accent-brand-500"
                      checked={m.notify}
                      onChange={(e) => toggleNotify(m.id, e.target.checked)}
                    />
                    接收提醒
                  </label>
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => {
                      if (confirm(`移除家庭成员"${m.name}"？`)) removeMember(m.id);
                    }}
                  >
                    移除
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Cheer / push */}
      <Card title="发送一句关心">
        <div className="flex gap-3 flex-wrap">
          {['记得按时吃药噢！', '今天感觉怎么样？', '周末回家看您 ❤️', '别忘了量血压'].map((t) => (
            <button
              key={t}
              onClick={() => setCheerText(t)}
              className="px-4 py-2 rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100"
              style={{ minHeight: 44 }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <TextInput value={cheerText} onChange={(e) => setCheerText(e.target.value)} />
        </div>
        <div className="flex gap-3 mt-3">
          <Button
            size="lg"
            onClick={() => {
              setCheerOpen(true);
            }}
          >
            发送到家庭群
          </Button>
          <SpeakButton text={cheerText} label="先试听" />
        </div>
      </Card>

      {/* Feed */}
      <Card title="家庭动态">
        {feed.length === 0 ? (
          <p className="text-ink-500">暂无动态。</p>
        ) : (
          <ul className="divide-y divide-brand-100">
            {feed.map((f) => {
              const member = family.find((m) => m.id === f.byMemberId);
              return (
                <li key={f.id} className="py-3 flex items-start gap-3">
                  <div className="text-2xl">{FEED_ICON[f.type]}</div>
                  <div className="flex-1">
                    <div className="font-medium text-ink-900">{f.title}</div>
                    <div className="text-xs text-ink-500 mt-1">
                      {member ? `${member.name} · ` : ''}
                      {dayjs(f.createdAt).format('MM-DD HH:mm')}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Add member modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="邀请家人"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              onClick={async () => {
                if (!name.trim()) return;
                await addMember({
                  name: name.trim(),
                  role,
                  relation,
                  phone: phone.trim() || undefined,
                  notify: true,
                  avatarColor: ['#FF8C00', '#22A06B', '#1F6FEB', '#E5484D'][family.length % 4],
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

      {/* Cheer share modal */}
      <Modal
        open={cheerOpen}
        onClose={() => setCheerOpen(false)}
        title="发送到家庭群"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCheerOpen(false)}>取消</Button>
            <Button
              onClick={async () => {
                await pushFeed({
                  type: 'cheer',
                  title: cheerText,
                  byMemberId: 'fm_son',
                });
                const r = await shareToFamily({
                  title: '家庭关心',
                  text: cheerText,
                });
                setCheerOpen(false);
                setShareTip(
                  r === 'shared' ? '已发送' : r === 'copied' ? '内容已复制，可粘贴到群' : '分享失败'
                );
                setTimeout(() => setShareTip(null), 2200);
              }}
            >
              确认发送
            </Button>
          </>
        }
      >
        <p className="text-ink-700">即将发送：</p>
        <div className="card-yellow mt-3 text-lg font-semibold">{cheerText}</div>
      </Modal>
    </div>
  );
}
