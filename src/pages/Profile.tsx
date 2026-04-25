import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, NumberInput, Select, TextInput } from '@/components/ui/Input';
import { Tag } from '@/components/ui/Tag';
import { useAppStore } from '@/store';
import type { ConditionCode } from '@/types';
import { adminService } from '@/services';
import { voiceService } from '@/services/voice';

const CONDITION_LABELS: Record<ConditionCode, string> = {
  hypertension: '高血压',
  type2_diabetes: '2 型糖尿病',
  hyperlipidemia: '高血脂',
  coronary_heart_disease: '冠心病',
  chronic_kidney_disease: '慢性肾病',
  other: '其他',
};

export function Profile() {
  const user = useAppStore((s) => s.user);
  const updateUser = useAppStore((s) => s.updateUser);
  const refresh = useAppStore((s) => s.refresh);
  const fontSize = useAppStore((s) => s.fontSize);
  const setFontSize = useAppStore((s) => s.setFontSize);
  const voicePrefs = useAppStore((s) => s.voicePrefs);
  const setVoicePrefs = useAppStore((s) => s.setVoicePrefs);

  const [name, setName] = useState(user?.name ?? '');
  const [age, setAge] = useState(user?.age ?? 0);
  const [gender, setGender] = useState(user?.gender ?? 'male');
  const [conditions, setConditions] = useState<ConditionCode[]>(user?.conditions ?? []);
  const [allergies, setAllergies] = useState((user?.allergies ?? []).join('、'));

  if (!user) return null;

  function toggleCondition(c: ConditionCode) {
    setConditions((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl md:text-2xl font-bold">个人中心</h2>

      <Card title="基本信息">
        <Field label="姓名">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="年龄">
            <NumberInput value={age} min={0} max={120} onChange={(e) => setAge(parseInt(e.target.value) || 0)} />
          </Field>
          <Field label="性别">
            <Select value={gender} onChange={(e) => setGender(e.target.value as 'male')}>
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="other">其他</option>
            </Select>
          </Field>
        </div>

        <Field label="慢病类型（可多选）">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CONDITION_LABELS) as ConditionCode[]).map((c) => {
              const active = conditions.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCondition(c)}
                  className={`px-4 py-2 rounded-xl border font-medium transition-colors ${
                    active ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-ink-300 text-ink-700'
                  }`}
                  style={{ minHeight: 44 }}
                >
                  {CONDITION_LABELS[c]}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="过敏史（用顿号、逗号分隔）">
          <TextInput value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="青霉素、阿司匹林" />
        </Field>

        <Button
          size="lg"
          onClick={() =>
            updateUser({
              name,
              age,
              gender,
              conditions,
              allergies: allergies.split(/[、,，]/).map((s) => s.trim()).filter(Boolean),
            })
          }
        >
          保存修改
        </Button>
      </Card>

      <Card title="显示设置">
        <Field label="字号" hint="适合不同视力情况">
          <div className="flex gap-2">
            {(['normal', 'large', 'xlarge'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFontSize(s)}
                className={`flex-1 px-4 py-3 rounded-xl border font-medium transition-colors ${
                  fontSize === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-ink-300'
                }`}
                style={{ minHeight: 56 }}
              >
                {s === 'normal' ? '标准 A' : s === 'large' ? '大字 A+' : '特大 A++'}
              </button>
            ))}
          </div>
        </Field>
      </Card>

      <Card title="语音播报">
        <p className="text-ink-500 mb-4">
          应用内"播报"按钮使用浏览器自带语音引擎，可连接蓝牙音箱朗读重要提醒。
        </p>
        <Field label="开关">
          <div className="flex gap-2">
            {[
              { v: true, label: '🔊 开启' },
              { v: false, label: '🔇 关闭' },
            ].map((o) => (
              <button
                key={String(o.v)}
                onClick={() => setVoicePrefs({ enabled: o.v })}
                className={`flex-1 px-4 py-3 rounded-xl border font-medium transition-colors ${
                  voicePrefs.enabled === o.v
                    ? 'bg-brand-500 text-ink-900 border-brand-500'
                    : 'bg-white border-brand-200'
                }`}
                style={{ minHeight: 56 }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label={`语速：${voicePrefs.rate.toFixed(2)}`}>
          <input
            type="range"
            min={0.6}
            max={1.4}
            step={0.05}
            value={voicePrefs.rate}
            onChange={(e) => setVoicePrefs({ rate: parseFloat(e.target.value) })}
            className="w-full accent-brand-500"
          />
        </Field>
        <Field label={`音量：${Math.round(voicePrefs.volume * 100)}%`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={voicePrefs.volume}
            onChange={(e) => setVoicePrefs({ volume: parseFloat(e.target.value) })}
            className="w-full accent-brand-500"
          />
        </Field>
        <Button
          size="lg"
          onClick={() =>
            voiceService.speak('这是一段语音测试。按时吃药，身体健康。', { force: true })
          }
        >
          🔊 试听
        </Button>
      </Card>

      <Card title="演示数据">
        <p className="text-ink-500 mb-4">
          所有数据保存在本地浏览器（localStorage），可随时清除并重新生成示例数据。
        </p>
        <div className="flex flex-wrap gap-3">
          <Tag>当前数据：{user.name} 的档案</Tag>
        </div>
        <div className="mt-4">
          <Button
            variant="danger"
            size="lg"
            onClick={async () => {
              if (confirm('将清除所有本地数据并重置为示例数据，确定吗？')) {
                await adminService.resetDemo();
                await refresh();
              }
            }}
          >
            重置为示例数据
          </Button>
        </div>
      </Card>
    </div>
  );
}
