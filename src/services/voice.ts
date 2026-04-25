/**
 * Voice service: cross-browser Web Speech API wrapper.
 *
 * 提供"音色预设"概念：每种预设组合 voice 偏好关键词 + rate + pitch。
 * 让老人可以从"温柔阿姨/活泼小妹/沉稳大叔/标准播报"等几个友好的名字里选，
 * 而不是面对一堆 "Microsoft Huihui Online (Natural)"。
 */

export type VoiceTone =
  | 'gentle'      // 温柔阿姨
  | 'lively'      // 活泼小妹
  | 'steady'      // 沉稳大叔
  | 'standard'    // 标准播报
  | 'kid'         // 童声小朋友
  | 'custom';     // 自选系统语音

export interface ToneSpec {
  id: VoiceTone;
  name: string;
  desc: string;
  emoji: string;
  /** 在系统 voice 名称里按顺序匹配，越靠前越优先 */
  voiceMatchers: RegExp[];
  /** 性别偏好备用过滤 */
  preferGender?: 'female' | 'male';
  rate: number;
  pitch: number;
  /** 语言锁定 */
  langPrefix?: string; // 'zh'
}

export const TONE_PRESETS: ToneSpec[] = [
  {
    id: 'gentle',
    name: '温柔阿姨',
    desc: '舒缓柔和，适合长辈',
    emoji: '👩',
    voiceMatchers: [/tingting/i, /mei-?jia/i, /sin-?ji/i, /xiaoxiao/i, /yaoyao/i, /huihui/i],
    preferGender: 'female',
    rate: 0.9,
    pitch: 1.05,
    langPrefix: 'zh',
  },
  {
    id: 'lively',
    name: '活泼小妹',
    desc: '语速稍快，亲切有活力',
    emoji: '👧',
    voiceMatchers: [/xiaoxiao/i, /yaoyao/i, /tingting/i, /female/i, /女/i],
    preferGender: 'female',
    rate: 1.1,
    pitch: 1.2,
    langPrefix: 'zh',
  },
  {
    id: 'steady',
    name: '沉稳大叔',
    desc: '中低音磁性，听感清晰',
    emoji: '👨',
    voiceMatchers: [/kangkang/i, /yunxi/i, /hanhan/i, /male/i, /男/i],
    preferGender: 'male',
    rate: 0.92,
    pitch: 0.85,
    langPrefix: 'zh',
  },
  {
    id: 'standard',
    name: '标准播报',
    desc: '新闻风格，吐字清晰',
    emoji: '📻',
    voiceMatchers: [/huihui/i, /^chinese/i, /zh-CN/i],
    rate: 1.0,
    pitch: 1.0,
    langPrefix: 'zh',
  },
  {
    id: 'kid',
    name: '童声小朋友',
    desc: '俏皮可爱，孙辈陪伴感',
    emoji: '🧒',
    voiceMatchers: [/xiaoxiao/i, /yaoyao/i, /female/i],
    preferGender: 'female',
    rate: 1.05,
    pitch: 1.45,
    langPrefix: 'zh',
  },
  {
    id: 'custom',
    name: '自选语音',
    desc: '使用系统中安装的任意语音',
    emoji: '🎛️',
    voiceMatchers: [],
    rate: 1.0,
    pitch: 1.0,
  },
];

export interface VoicePrefs {
  enabled: boolean;
  tone: VoiceTone;
  /** 仅 tone='custom' 时使用 */
  customVoiceURI?: string;
  /** 用户在预设基础上的微调 */
  rateAdjust: number; // -0.3 ~ +0.3 加到预设 rate 上
  volume: number; // 0 - 1
}

const KEY = 'cmm.voicePrefs.v2';

const defaultPrefs: VoicePrefs = {
  enabled: true,
  tone: 'gentle',
  rateAdjust: 0,
  volume: 1,
};

function loadPrefs(): VoicePrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { ...defaultPrefs };
}

function savePrefs(p: VoicePrefs) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

function getToneSpec(id: VoiceTone): ToneSpec {
  return TONE_PRESETS.find((t) => t.id === id) ?? TONE_PRESETS[0];
}

export const voiceService = {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  },
  getPrefs(): VoicePrefs {
    return loadPrefs();
  },
  setPrefs(patch: Partial<VoicePrefs>): VoicePrefs {
    const next = { ...loadPrefs(), ...patch };
    savePrefs(next);
    return next;
  },
  listVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported()) return [];
    return window.speechSynthesis.getVoices();
  },
  listChineseVoices(): SpeechSynthesisVoice[] {
    return this.listVoices().filter((v) => /^zh/i.test(v.lang));
  },
  getTones(): ToneSpec[] {
    return TONE_PRESETS;
  },
  pickVoice(prefs?: VoicePrefs): SpeechSynthesisVoice | undefined {
    if (!this.isSupported()) return;
    const p = prefs ?? loadPrefs();
    const voices = window.speechSynthesis.getVoices();
    if (p.tone === 'custom' && p.customVoiceURI) {
      const found = voices.find((v) => v.voiceURI === p.customVoiceURI);
      if (found) return found;
    }
    const spec = getToneSpec(p.tone);
    const langPool = spec.langPrefix
      ? voices.filter((v) => new RegExp(`^${spec.langPrefix}`, 'i').test(v.lang))
      : voices;
    const pool = langPool.length > 0 ? langPool : voices;

    for (const matcher of spec.voiceMatchers) {
      const hit = pool.find((v) => matcher.test(v.name) || matcher.test(v.voiceURI));
      if (hit) return hit;
    }
    if (spec.preferGender) {
      const re = spec.preferGender === 'female' ? /female|女|huihui|xiaoxiao|tingting|mei|yaoyao/i : /male|男|kangkang|yunxi|hanhan/i;
      const hit = pool.find((v) => re.test(v.name));
      if (hit) return hit;
    }
    return pool[0];
  },
  cancel() {
    if (!this.isSupported()) return;
    window.speechSynthesis.cancel();
  },
  speak(text: string, opts: { force?: boolean; toneOverride?: VoiceTone } = {}): void {
    if (!this.isSupported() || !text) return;
    const prefs = loadPrefs();
    if (!prefs.enabled && !opts.force) return;
    const useTone = opts.toneOverride ?? prefs.tone;
    const spec = getToneSpec(useTone);
    const voice = this.pickVoice({ ...prefs, tone: useTone });
    const utter = new SpeechSynthesisUtterance(text);
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    } else {
      utter.lang = 'zh-CN';
    }
    utter.rate = Math.max(0.5, Math.min(1.6, spec.rate + prefs.rateAdjust));
    utter.pitch = Math.max(0.5, Math.min(2, spec.pitch));
    utter.volume = prefs.volume;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  },
};

if (voiceService.isSupported()) {
  window.speechSynthesis.onvoiceschanged = () => {
    /* trigger voices refresh */
  };
}
