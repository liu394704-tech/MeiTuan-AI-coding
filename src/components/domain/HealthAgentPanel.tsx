import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/Input';
import type { HealthScoreResult, Recommendation } from '@/utils/healthScore';

/**
 * 健康助手 Agent —— 原型版
 * - 当前用规则匹配 + 模板回复，模拟 LLM 输出
 * - 接口签名设计为：输入 (question, context) → ChatMsg[]，
 *   未来可无缝替换为 LLM (OpenAI / 通义 / 文心) 调用
 */

export type AgentRole = 'doctor' | 'nutritionist' | 'coach';

interface AgentSpec {
  id: AgentRole;
  name: string;
  emoji: string;
  desc: string;
  greet: string;
}

const AGENTS: AgentSpec[] = [
  {
    id: 'doctor',
    name: '健康医生',
    emoji: '👨‍⚕️',
    desc: '帮您解读指标、回答用药与复诊问题',
    greet: '您好，我是您的健康助手医生。可以问我任何与用药、指标、复诊有关的问题。',
  },
  {
    id: 'nutritionist',
    name: '营养顾问',
    emoji: '🥗',
    desc: '搭配饮食、控盐控糖、适合慢病人群',
    greet: '我是您的营养顾问。今天想吃什么？我帮您看看是否合适。',
  },
  {
    id: 'coach',
    name: '运动教练',
    emoji: '🏃',
    desc: '为您量身设计安全的运动量',
    greet: '我是您的运动教练。慢病人群运动讲究循序渐进，告诉我您现在的状况吧。',
  },
];

interface Msg {
  id: string;
  role: 'agent' | 'user';
  text: string;
  isThinking?: boolean;
}

const SUGGESTED: Record<AgentRole, string[]> = {
  doctor: [
    '我的血压最近偏高，要紧吗？',
    '阿司匹林能和氨氯地平一起吃吗？',
    '什么时候应该复查 HbA1c？',
  ],
  nutritionist: [
    '早餐吃什么对血糖好？',
    '可以喝小米粥吗？',
    '高血压患者每天能吃多少盐？',
  ],
  coach: [
    '我可以晨跑吗？',
    '一天走多少步合适？',
    '膝盖不好，有什么替代运动？',
  ],
};

interface Props {
  scoreResult: HealthScoreResult;
  recommendations: Recommendation[];
}

export function HealthAgentPanel({ scoreResult, recommendations }: Props) {
  const [agent, setAgent] = useState<AgentRole>('doctor');
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 'g_doctor', role: 'agent', text: AGENTS[0].greet },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  function switchAgent(id: AgentRole) {
    setAgent(id);
    const spec = AGENTS.find((a) => a.id === id)!;
    setMsgs([{ id: `g_${id}_${Date.now()}`, role: 'agent', text: spec.greet }]);
  }

  function ask(q: string) {
    if (!q.trim() || busy) return;
    const userMsg: Msg = { id: `u_${Date.now()}`, role: 'user', text: q };
    setMsgs((prev) => [
      ...prev,
      userMsg,
      { id: `t_${Date.now() + 1}`, role: 'agent', text: '正在思考…', isThinking: true },
    ]);
    setInput('');
    setBusy(true);
    // 原型：本地规则替代 LLM 调用，500-900ms 延迟模拟思考
    const delay = 500 + Math.random() * 400;
    setTimeout(() => {
      const reply = mockReply({ q, agent, scoreResult, recommendations });
      setMsgs((prev) => [
        ...prev.filter((m) => !m.isThinking),
        { id: `a_${Date.now()}`, role: 'agent', text: reply },
      ]);
      setBusy(false);
    }, delay);
  }

  const spec = AGENTS.find((a) => a.id === agent)!;

  return (
    <div className="rounded-xl2 shadow-soft border border-brand-200 bg-white overflow-hidden flex flex-col h-full min-h-[520px] max-h-[78vh]">
      {/* Header */}
      <div className="px-4 py-3 bg-brand-50 border-b border-brand-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{spec.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-ink-900">{spec.name} <span className="text-xs font-normal text-ink-500">原型版</span></div>
            <div className="text-xs text-ink-500 truncate">{spec.desc}</div>
          </div>
        </div>
        <div className="flex gap-1">
          {AGENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => switchAgent(a.id)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                agent === a.id ? 'bg-white text-brand-800 shadow-sm' : 'bg-white/40 text-ink-700'
              }`}
              style={{ minHeight: 36 }}
            >
              {a.emoji} {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3 bg-canvas/40">
        {msgs.map((m) => (
          <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'agent' && (
              <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center text-base shrink-0">
                {spec.emoji}
              </div>
            )}
            <div
              className={`max-w-[80%] px-3.5 py-2.5 leading-relaxed text-sm shadow-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-brand-400 text-ink-900 rounded-2xl rounded-tr-sm'
                  : m.isThinking
                  ? 'bg-white border border-brand-100 rounded-2xl rounded-tl-sm text-ink-500 italic'
                  : 'bg-white border border-brand-100 rounded-2xl rounded-tl-sm text-ink-900'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Suggested questions */}
      <div className="px-3 py-2 bg-white border-t border-brand-100 flex gap-2 overflow-x-auto">
        {SUGGESTED[agent].map((q) => (
          <button
            key={q}
            onClick={() => ask(q)}
            disabled={busy}
            className="shrink-0 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-xs hover:bg-brand-100 disabled:opacity-50"
            style={{ minHeight: 32 }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-brand-100 flex items-center gap-2">
        <TextInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              ask(input);
            }
          }}
          placeholder="问问健康问题…"
          className="!min-h-[44px] !py-2"
          disabled={busy}
        />
        <Button onClick={() => ask(input)} disabled={busy || !input.trim()} className="shrink-0">
          发送
        </Button>
      </div>

      <div className="px-4 py-2 bg-brand-50/60 border-t border-brand-100 text-xs text-ink-500">
        💡 当前为原型版，回答由规则引擎模拟生成，不构成医疗建议。后续可接入 LLM。
      </div>
    </div>
  );
}

/* ===== Mock reply engine =====
 * 真实接入 LLM 后，整段函数可替换为 fetch('/api/agent', { body: { agent, q, ctx } })
 */
function mockReply(input: {
  q: string;
  agent: AgentRole;
  scoreResult: HealthScoreResult;
  recommendations: Recommendation[];
}): string {
  const { q, agent, scoreResult, recommendations } = input;
  const text = q.trim();
  const flags = scoreResult.flags;
  const top = recommendations[0];

  const intro = (() => {
    if (agent === 'doctor') return '👨‍⚕️ 综合您最近的指标来看：';
    if (agent === 'nutritionist') return '🥗 从饮食角度建议您：';
    return '🏃 从运动角度建议您：';
  })();

  // 关键词路由
  if (/(血压|高压|低压|降压)/.test(text)) {
    return [
      intro,
      flags.bpHigh
        ? '您近 14 天血压均值偏高，建议清晨起床静坐 5 分钟后再测量，并把连续 7 天的记录带给医生。'
        : '您当前血压在控制范围内，继续保持。',
      '日常注意：少盐（每日 < 5g），避免突然用力（如搬重物），冬季注意保暖。',
    ].join('\n');
  }

  if (/(血糖|糖|HbA1c|糖化)/.test(text)) {
    return [
      intro,
      flags.bgHigh || flags.a1cHigh
        ? `空腹血糖均值偏高。建议 ${agent === 'nutritionist' ? '主食 1/3 换成杂粮，先吃菜再吃饭。' : '在早餐前测一次空腹血糖，餐后 2 小时再测一次。'}`
        : '血糖控制基本平稳。',
      '建议每周记录 2 天的"空腹 + 餐后"血糖，能更早发现波动。',
    ].join('\n');
  }

  if (/(吃|饭|菜|食物|早餐|午餐|晚餐|加餐|水果|零食)/.test(text)) {
    if (agent !== 'nutritionist') {
      return '这是营养相关的问题，建议切换到 🥗 营养顾问，会给到更专业的搭配建议。';
    }
    return [
      '🥗 给您一个适合慢病人群的搭配思路：',
      '· 主食：1/3 杂粮（燕麦、糙米、红豆）',
      '· 蛋白：鸡蛋 1 个 + 鱼/瘦肉 50–75g',
      '· 蔬菜：每餐 200g 左右，深色蔬菜过半',
      '· 水果：每天一个拳头大小，分两次吃',
      '吃饭顺序按"菜 → 蛋白 → 主食"，对血糖最友好。',
    ].join('\n');
  }

  if (/(走|跑|步|运动|跳|游|散步|爬山|健身)/.test(text)) {
    if (agent !== 'coach') {
      return '关于运动量的问题，建议切换到 🏃 运动教练，更有针对性。';
    }
    return [
      '🏃 慢病人群的运动安全口诀：循序渐进 + 心率可控。',
      '· 每天目标 6000 步，分 2–3 次完成（餐后 30 分钟最好）',
      '· 速度：每分钟 100 步左右，能说话但不能唱歌',
      '· 每周 2 次轻量抗阻训练（弹力带 / 自重深蹲扶椅子）',
      '· 出现胸闷、头晕请立刻停下休息。',
    ].join('\n');
  }

  if (/(漏服|忘记|忘吃|忘了)/.test(text)) {
    return [
      intro,
      '一般原则：发现漏服距下一次还 ≥ 1/2 间隔时间 → 可补服；< 1/2 → 跳过本次，绝不双倍补。',
      '降压药/降糖药漏服请优先咨询医生，特别是次日血压/血糖出现明显异常时。',
    ].join('\n');
  }

  if (/(库存|药用完|没药|续方)/.test(text)) {
    return '您可以在"我的药品"页面看到每个药的剩余天数，库存不足时系统会自动提醒并生成购药清单。复诊时可一次性续方 1–3 个月用量。';
  }

  if (/(复诊|看医生|挂号|什么时候去医院)/.test(text)) {
    return [
      intro,
      '建议慢病患者每 2–3 个月复诊一次，每半年做一次生化全套体检。',
      '若血压/血糖连续 3 天明显异常，应提前复诊。',
    ].join('\n');
  }

  if (/(评分|分数|健康|怎么样)/.test(text)) {
    return [
      intro,
      `您当前综合健康分 ${scoreResult.overall} 分（${scoreResult.verdict === 'good' ? '良好' : scoreResult.verdict === 'fair' ? '需要关注' : '需要重点干预'}）。`,
      ...scoreResult.subs.map((s) => `· ${s.label} ${s.score} 分 — ${s.detail}`),
      top ? `\n最重要的一条建议：${top.title}。${top.body}` : '',
    ].join('\n');
  }

  // 默认：贴上一份针对性的提示
  return [
    intro,
    '您的问题我记下了。基于您当前的数据，我可以给您一些建议：',
    top ? `· ${top.title}：${top.body}` : '· 保持当前节奏，按时吃药、规律生活。',
    '\n您也可以试试下面的常见问题，或换个 Agent 角色咨询。',
  ].join('\n');
}
