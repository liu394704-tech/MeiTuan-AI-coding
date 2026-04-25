/**
 * Voice service: cross-browser Web Speech API wrapper.
 * - 单例：保证全局只有一个 SpeechSynthesis 队列
 * - 提供静音、语速、音量、首选语音的全局开关
 * - 监听 SpeechSynthesis 的 voiceschanged，自动挑选中文女声
 */

export interface VoicePrefs {
  enabled: boolean;
  rate: number; // 0.5 - 1.6
  volume: number; // 0 - 1
  voiceURI?: string;
}

const KEY = 'cmm.voicePrefs.v1';

const defaultPrefs: VoicePrefs = {
  enabled: true,
  rate: 0.95,
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
  pickVoice(): SpeechSynthesisVoice | undefined {
    if (!this.isSupported()) return;
    const prefs = loadPrefs();
    const voices = window.speechSynthesis.getVoices();
    if (prefs.voiceURI) {
      const found = voices.find((v) => v.voiceURI === prefs.voiceURI);
      if (found) return found;
    }
    // 优先中文（zh-CN / zh-HK / zh-TW），偏好"女声 / Tingting / Mei-Jia"
    const zh = voices.filter((v) => /^zh/i.test(v.lang));
    const preferred =
      zh.find((v) => /tingting|mei-jia|xiaoxiao|yaoyao|female|女/i.test(v.name)) ??
      zh[0];
    return preferred ?? voices[0];
  },
  cancel() {
    if (!this.isSupported()) return;
    window.speechSynthesis.cancel();
  },
  speak(text: string, opts: { force?: boolean } = {}): void {
    if (!this.isSupported() || !text) return;
    const prefs = loadPrefs();
    if (!prefs.enabled && !opts.force) return;
    const utter = new SpeechSynthesisUtterance(text);
    const voice = this.pickVoice();
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    } else {
      utter.lang = 'zh-CN';
    }
    utter.rate = prefs.rate;
    utter.volume = prefs.volume;
    utter.pitch = 1;
    // 排队前清掉同一句的残余，避免叠音
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  },
};

// 部分浏览器需要触发一次 voices 加载
if (voiceService.isSupported()) {
  window.speechSynthesis.onvoiceschanged = () => {
    /* trigger refresh */
  };
}
