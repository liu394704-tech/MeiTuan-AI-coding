import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, NumberInput, Select, TextInput, Textarea } from '@/components/ui/Input';
import { useAppStore } from '@/store';
import { dayjs } from '@/utils/date';
import type { Frequency, MedicationForm, WithFood } from '@/types';

const FREQ_TEMPLATES: Array<{ label: string; freq: Frequency }> = [
  { label: '每日 1 次（早 8:00）', freq: { type: 'daily', timesPerDay: 1, times: ['08:00'] } },
  { label: '每日 2 次（早 8 / 晚 8）', freq: { type: 'daily', timesPerDay: 2, times: ['08:00', '20:00'] } },
  { label: '每日 3 次（三餐后）', freq: { type: 'daily', timesPerDay: 3, times: ['08:00', '12:00', '18:00'] } },
  { label: '每日 1 次（睡前 21:00）', freq: { type: 'daily', timesPerDay: 1, times: ['21:00'] } },
  { label: '每周 3 次（一三五 早 8:00）', freq: { type: 'weekly', timesPerDay: 1, times: ['08:00'], weekdays: [1, 3, 5] } },
  { label: '隔日 1 次（早 8:00）', freq: { type: 'interval', timesPerDay: 1, times: ['08:00'], intervalDays: 2 } },
];

export function MedicationWizard() {
  const navigate = useNavigate();
  const addMedication = useAppStore((s) => s.addMedication);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [name, setName] = useState('');
  const [spec, setSpec] = useState('');
  const [form, setForm] = useState<MedicationForm>('tablet');
  const [unit, setUnit] = useState('片');
  const [purpose, setPurpose] = useState('');
  const [prescribedBy, setPrescribedBy] = useState('');

  const [freqIndex, setFreqIndex] = useState<number>(1);
  const [dosage, setDosage] = useState<number>(1);
  const [withFood, setWithFood] = useState<WithFood>('after');
  const [notes, setNotes] = useState('');

  const [initialQuantity, setInitialQuantity] = useState<number>(30);
  const [lowStockThresholdDays, setLowStockThresholdDays] = useState<number>(5);

  const freq = FREQ_TEMPLATES[freqIndex].freq;

  const dailyDose =
    dosage *
    freq.timesPerDay *
    (freq.type === 'daily'
      ? 1
      : freq.type === 'weekly'
      ? (freq.weekdays?.length ?? 7) / 7
      : 1 / Math.max(1, freq.intervalDays ?? 1));
  const estimatedDaysLeft = dailyDose > 0 ? Math.floor(initialQuantity / dailyDose) : 0;

  const canNext1 = name.trim() && spec.trim() && purpose.trim();
  const canFinish = initialQuantity > 0;

  async function handleSubmit() {
    await addMedication({
      medication: {
        name: name.trim(),
        spec: spec.trim(),
        form,
        unit,
        purpose: purpose.trim(),
        prescribedBy: prescribedBy.trim() || undefined,
        startDate: dayjs().format('YYYY-MM-DD'),
        endDate: null,
      },
      regimen: {
        dosage,
        unit,
        frequency: freq,
        withFood,
        notes: notes.trim() || undefined,
      },
      initialQuantity,
      lowStockThresholdDays,
    });
    navigate('/medications');
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold">添加药品</h2>
        <p className="text-ink-500 mt-1">3 步即可完成</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex-1 flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold ${
                step >= n ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-500'
              }`}
            >
              {n}
            </div>
            <div className="text-sm font-medium">
              {n === 1 ? '基本信息' : n === 2 ? '用法' : '库存'}
            </div>
            {n < 3 && <div className={`flex-1 h-1 rounded ${step > n ? 'bg-brand-500' : 'bg-ink-100'}`} />}
          </div>
        ))}
      </div>

      <Card>
        {step === 1 && (
          <div>
            <Field label="药品名称">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：氨氯地平片" />
            </Field>
            <Field label="规格">
              <TextInput value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="例如：5mg/片" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="剂型">
                <Select value={form} onChange={(e) => setForm(e.target.value as MedicationForm)}>
                  <option value="tablet">片剂</option>
                  <option value="capsule">胶囊</option>
                  <option value="liquid">口服液</option>
                  <option value="injection">注射</option>
                  <option value="other">其他</option>
                </Select>
              </Field>
              <Field label="计量单位">
                <TextInput value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="片 / 粒 / ml" />
              </Field>
            </div>
            <Field label="用药目的（如：降压、降糖）">
              <TextInput value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="降压" />
            </Field>
            <Field label="开方医生 / 医院（可选）">
              <TextInput
                value={prescribedBy}
                onChange={(e) => setPrescribedBy(e.target.value)}
                placeholder="张医生 / 北京协和"
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div>
            <Field label="服药频率（点选模板）">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {FREQ_TEMPLATES.map((t, i) => (
                  <button
                    key={t.label}
                    onClick={() => setFreqIndex(i)}
                    className={`text-left p-3 rounded-xl border transition-colors ${
                      freqIndex === i
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-ink-300 hover:border-brand-300'
                    }`}
                  >
                    <div className="font-medium">{t.label}</div>
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="单次剂量">
                <NumberInput
                  value={dosage}
                  min={0.5}
                  step={0.5}
                  onChange={(e) => setDosage(parseFloat(e.target.value) || 1)}
                />
              </Field>
              <Field label="服用方式">
                <Select value={withFood} onChange={(e) => setWithFood(e.target.value as WithFood)}>
                  <option value="before">饭前</option>
                  <option value="with">随餐</option>
                  <option value="after">饭后</option>
                  <option value="any">不限</option>
                </Select>
              </Field>
            </div>
            <Field label="备注（可选）">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="例如：温水送服、不要漏服"
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div>
            <Field label="当前库存量" hint="以最小单位计，例如：30 片">
              <NumberInput
                value={initialQuantity}
                min={0}
                onChange={(e) => setInitialQuantity(parseInt(e.target.value) || 0)}
              />
            </Field>
            <Field label="库存预警阈值（天）" hint="当剩余可用天数 ≤ 此数时，会触发补药提醒">
              <NumberInput
                value={lowStockThresholdDays}
                min={1}
                onChange={(e) => setLowStockThresholdDays(parseInt(e.target.value) || 3)}
              />
            </Field>

            <div className="mt-4 p-4 rounded-xl bg-brand-50/60">
              <div className="text-sm text-ink-700">
                按当前用量，预计可用：
                <span className="text-2xl font-bold text-brand-700 ml-2">{estimatedDaysLeft}</span>
                <span className="ml-1 text-ink-500">天</span>
              </div>
              <div className="text-xs text-ink-500 mt-1">
                日均消耗 ≈ {dailyDose.toFixed(2)} {unit}/天
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button
          variant="ghost"
          size="lg"
          disabled={step === 1}
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2) : s))}
        >
          上一步
        </Button>
        {step < 3 ? (
          <Button
            size="lg"
            disabled={step === 1 ? !canNext1 : false}
            onClick={() => setStep((s) => (s < 3 ? ((s + 1) as 2 | 3) : s))}
          >
            下一步
          </Button>
        ) : (
          <Button size="lg" disabled={!canFinish} onClick={handleSubmit}>
            完成添加
          </Button>
        )}
      </div>
    </div>
  );
}
