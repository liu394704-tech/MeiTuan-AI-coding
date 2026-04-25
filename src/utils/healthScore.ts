import type { MedicalReport, MedicationEvent, User, VitalReading } from '@/types';
import { computeAdherence } from './adherence';
import { dayjs } from './date';

export type Verdict = 'good' | 'fair' | 'poor';

export interface SubScore {
  /** 'adherence' | 'vitals' | 'lifestyle' | 'reports' */
  key: 'adherence' | 'vitals' | 'lifestyle' | 'reports';
  label: string;
  emoji: string;
  score: number; // 0-100
  weight: number; // 0-1
  verdict: Verdict;
  detail: string; // 一句话解释
  signals: string[]; // 计算用到的关键观察项
}

export interface HealthScoreResult {
  overall: number;
  verdict: Verdict;
  subs: SubScore[];
  asOf: string;
  /** 派生的"诊断标签"，给建议引擎用 */
  flags: {
    bpHigh: boolean;
    bgHigh: boolean;
    sleepShort: boolean;
    stepsLow: boolean;
    weightTrendUp: boolean;
    lipidHigh: boolean;
    a1cHigh: boolean;
    adherenceLow: boolean;
  };
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function verdictOf(score: number): Verdict {
  return score >= 80 ? 'good' : score >= 60 ? 'fair' : 'poor';
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function recent<T extends { measuredAt: string }>(arr: T[], days: number): T[] {
  const since = dayjs().subtract(days, 'day');
  return arr.filter((x) => dayjs(x.measuredAt).isAfter(since));
}

/* ===== Sub-score calculators ===== */

function scoreAdherence(events: MedicationEvent[]): SubScore {
  const r = computeAdherence(events, 7);
  const score = r.scheduled === 0 ? 90 : r.score;
  return {
    key: 'adherence',
    label: '用药依从',
    emoji: '💊',
    score,
    weight: 0.3,
    verdict: verdictOf(score),
    detail:
      r.scheduled === 0
        ? '近 7 天暂无用药记录'
        : `近 7 天按时服药 ${r.taken} / ${r.scheduled} 次${r.missed > 0 ? `，漏服 ${r.missed} 次` : ''}`,
    signals: r.consecutiveMissedMax >= 2 ? [`出现连续漏服 ${r.consecutiveMissedMax} 次`] : [],
  };
}

function scoreVitals(vitals: VitalReading[]): { sub: SubScore; bpHigh: boolean; bgHigh: boolean } {
  const bp = recent(vitals.filter((v) => v.kind === 'blood_pressure'), 14);
  const bg = recent(vitals.filter((v) => v.kind === 'blood_glucose'), 14);
  const hr = recent(vitals.filter((v) => v.kind === 'heart_rate'), 14);

  let score = 100;
  const signals: string[] = [];
  let bpHigh = false;
  let bgHigh = false;

  if (bp.length > 0) {
    const sysAvg = avg(bp.map((v) => v.value));
    const diaAvg = avg(bp.map((v) => v.value2 ?? 0).filter((x) => x > 0));
    if (sysAvg >= 160 || diaAvg >= 100) {
      score -= 35;
      signals.push(`平均血压 ${Math.round(sysAvg)}/${Math.round(diaAvg)} 偏高`);
      bpHigh = true;
    } else if (sysAvg >= 140 || diaAvg >= 90) {
      score -= 18;
      signals.push(`平均血压 ${Math.round(sysAvg)}/${Math.round(diaAvg)} 略高`);
      bpHigh = true;
    } else {
      signals.push(`平均血压 ${Math.round(sysAvg)}/${Math.round(diaAvg)} 控制良好`);
    }
  } else {
    score -= 8;
    signals.push('近 14 天无血压记录');
  }

  if (bg.length > 0) {
    const bgAvg = avg(bg.map((v) => v.value));
    if (bgAvg >= 8.5) {
      score -= 25;
      signals.push(`空腹血糖均值 ${bgAvg.toFixed(1)} mmol/L 偏高`);
      bgHigh = true;
    } else if (bgAvg >= 7.0) {
      score -= 12;
      signals.push(`空腹血糖均值 ${bgAvg.toFixed(1)} mmol/L 略高`);
      bgHigh = true;
    } else if (bgAvg < 4.0) {
      score -= 12;
      signals.push(`空腹血糖均值 ${bgAvg.toFixed(1)} mmol/L 偏低`);
    } else {
      signals.push(`空腹血糖均值 ${bgAvg.toFixed(1)} mmol/L 正常`);
    }
  }

  if (hr.length > 0) {
    const hrAvg = avg(hr.map((v) => v.value));
    if (hrAvg >= 95) {
      score -= 8;
      signals.push(`静息心率均值 ${Math.round(hrAvg)} bpm 偏快`);
    } else if (hrAvg <= 50) {
      score -= 8;
      signals.push(`静息心率均值 ${Math.round(hrAvg)} bpm 偏慢`);
    }
  }

  return {
    sub: {
      key: 'vitals',
      label: '身体指标',
      emoji: '🩺',
      score: clamp(score),
      weight: 0.35,
      verdict: verdictOf(clamp(score)),
      detail: signals[0] ?? '请定期记录血压与血糖',
      signals,
    },
    bpHigh,
    bgHigh,
  };
}

function scoreLifestyle(vitals: VitalReading[]): {
  sub: SubScore;
  sleepShort: boolean;
  stepsLow: boolean;
  weightTrendUp: boolean;
} {
  const steps = recent(vitals.filter((v) => v.kind === 'steps'), 7);
  const sleep = recent(vitals.filter((v) => v.kind === 'sleep_hours'), 7);
  const weight = vitals.filter((v) => v.kind === 'weight').sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));

  let score = 100;
  const signals: string[] = [];
  let stepsLow = false;
  let sleepShort = false;
  let weightTrendUp = false;

  if (steps.length > 0) {
    const stepsAvg = avg(steps.map((v) => v.value));
    if (stepsAvg < 3000) {
      score -= 25;
      signals.push(`日均 ${Math.round(stepsAvg)} 步，活动不足`);
      stepsLow = true;
    } else if (stepsAvg < 5000) {
      score -= 12;
      signals.push(`日均 ${Math.round(stepsAvg)} 步，活动偏少`);
      stepsLow = true;
    } else {
      signals.push(`日均 ${Math.round(stepsAvg)} 步，活动达标`);
    }
  } else {
    score -= 8;
    signals.push('近 7 天无步数数据');
  }

  if (sleep.length > 0) {
    const sleepAvg = avg(sleep.map((v) => v.value));
    if (sleepAvg < 6) {
      score -= 18;
      signals.push(`日均睡眠 ${sleepAvg.toFixed(1)} 小时偏少`);
      sleepShort = true;
    } else if (sleepAvg > 9) {
      score -= 8;
      signals.push(`日均睡眠 ${sleepAvg.toFixed(1)} 小时偏多`);
    } else {
      signals.push(`日均睡眠 ${sleepAvg.toFixed(1)} 小时充足`);
    }
  }

  if (weight.length >= 2) {
    const last = weight[weight.length - 1].value;
    const first = weight[0].value;
    const delta = last - first;
    if (delta > 1.5) {
      score -= 8;
      signals.push(`体重上升 ${delta.toFixed(1)} kg，需关注`);
      weightTrendUp = true;
    } else if (delta < -2) {
      signals.push(`体重下降 ${Math.abs(delta).toFixed(1)} kg`);
    }
  }

  return {
    sub: {
      key: 'lifestyle',
      label: '生活方式',
      emoji: '🚶',
      score: clamp(score),
      weight: 0.2,
      verdict: verdictOf(clamp(score)),
      detail: signals[0] ?? '保持规律作息和适度运动',
      signals,
    },
    sleepShort,
    stepsLow,
    weightTrendUp,
  };
}

function scoreReports(reports: MedicalReport[]): {
  sub: SubScore;
  lipidHigh: boolean;
  a1cHigh: boolean;
} {
  if (reports.length === 0) {
    return {
      sub: {
        key: 'reports',
        label: '体检报告',
        emoji: '📋',
        score: 80,
        weight: 0.15,
        verdict: 'good',
        detail: '暂未上传体检报告',
        signals: [],
      },
      lipidHigh: false,
      a1cHigh: false,
    };
  }
  const latest = [...reports].sort((a, b) => b.reportDate.localeCompare(a.reportDate))[0];
  let score = 100;
  const signals: string[] = [];
  let lipidHigh = false;
  let a1cHigh = false;
  for (const h of latest.highlights) {
    if (h.level === 'high') {
      score -= 12;
      signals.push(`${h.label} 偏高 (${h.value})`);
      if (/LDL|胆固醇|脂蛋白/i.test(h.label)) lipidHigh = true;
      if (/HbA1c|糖化/i.test(h.label)) a1cHigh = true;
    } else if (h.level === 'low') {
      score -= 8;
      signals.push(`${h.label} 偏低 (${h.value})`);
    }
  }
  // 报告越久越打折
  const daysOld = dayjs().diff(dayjs(latest.reportDate), 'day');
  if (daysOld > 180) score -= 10;

  return {
    sub: {
      key: 'reports',
      label: '体检报告',
      emoji: '📋',
      score: clamp(score),
      weight: 0.15,
      verdict: verdictOf(clamp(score)),
      detail: `最近一份：${latest.title}（${latest.reportDate}）`,
      signals,
    },
    lipidHigh,
    a1cHigh,
  };
}

export function computeHealthScore(input: {
  user: User | null;
  events: MedicationEvent[];
  vitals: VitalReading[];
  reports: MedicalReport[];
}): HealthScoreResult {
  const ad = scoreAdherence(input.events);
  const vt = scoreVitals(input.vitals);
  const lf = scoreLifestyle(input.vitals);
  const rp = scoreReports(input.reports);

  const subs = [ad, vt.sub, lf.sub, rp.sub];
  const overall = Math.round(subs.reduce((acc, s) => acc + s.score * s.weight, 0));

  return {
    overall: clamp(overall),
    verdict: verdictOf(overall),
    subs,
    asOf: dayjs().toISOString(),
    flags: {
      bpHigh: vt.bpHigh,
      bgHigh: vt.bgHigh,
      sleepShort: lf.sleepShort,
      stepsLow: lf.stepsLow,
      weightTrendUp: lf.weightTrendUp,
      lipidHigh: rp.lipidHigh,
      a1cHigh: rp.a1cHigh,
      adherenceLow: ad.score < 70,
    },
  };
}

/* ===== 个性化建议（饮食 / 活动 / 监测）===== */

export interface Recommendation {
  category: '饮食' | '活动' | '监测' | '用药';
  emoji: string;
  title: string;
  body: string;
  priority: 1 | 2 | 3; // 1 最高
}

export function generateRecommendations(r: HealthScoreResult, conditions: string[] = []): Recommendation[] {
  const out: Recommendation[] = [];
  const f = r.flags;

  if (f.bpHigh) {
    out.push({
      category: '饮食',
      emoji: '🧂',
      title: '严格控盐：每日 < 5 克',
      body: '出门吃饭少要汤汁，腌制食品（咸菜、腊肉）少吃；做菜可用柠檬、香醋替代部分盐。',
      priority: 1,
    });
    out.push({
      category: '监测',
      emoji: '🩺',
      title: '清晨血压 + 睡前血压各测一次',
      body: '记录后在"AI 助手"页录入，连续 1 周方便医生评估。',
      priority: 1,
    });
  }
  if (f.bgHigh || f.a1cHigh) {
    out.push({
      category: '饮食',
      emoji: '🥗',
      title: '吃饭顺序：先菜 → 蛋白 → 主食',
      body: '主食 1/3 换成杂粮（燕麦、红豆），餐后血糖会更平稳。',
      priority: 1,
    });
    out.push({
      category: '活动',
      emoji: '🚶',
      title: '餐后 30 分钟散步 20 分钟',
      body: '中等速度（每分钟 100 步）比饭后久坐能多降 0.5 mmol/L 餐后血糖。',
      priority: 2,
    });
  }
  if (f.lipidHigh) {
    out.push({
      category: '饮食',
      emoji: '🐟',
      title: '每周 2 次深海鱼 + 每天一小把坚果',
      body: '鱼油中的 Omega-3 与坚果中的不饱和脂肪有助于降 LDL。',
      priority: 2,
    });
  }
  if (f.stepsLow) {
    out.push({
      category: '活动',
      emoji: '👟',
      title: '把目标设到日均 6000 步',
      body: '可分 3 次完成：晨起社区走 2000、餐后 2 次各 2000。',
      priority: 2,
    });
  } else {
    out.push({
      category: '活动',
      emoji: '💪',
      title: '加入 2 次抗阻训练',
      body: '每周 2 次，每次 15 分钟弹力带或自重练习，对维持肌量很有帮助。',
      priority: 3,
    });
  }
  if (f.sleepShort) {
    out.push({
      category: '活动',
      emoji: '😴',
      title: '晚上 11 点前入睡',
      body: '睡前 1 小时不刷手机；卧室温度 20–22℃。睡眠改善后血压也会更稳。',
      priority: 2,
    });
  }
  if (f.weightTrendUp) {
    out.push({
      category: '饮食',
      emoji: '🍚',
      title: '主食每餐减半拳头',
      body: '一周可让体重缓慢回落 0.3–0.5 kg。',
      priority: 3,
    });
  }
  if (f.adherenceLow) {
    out.push({
      category: '用药',
      emoji: '⏰',
      title: '把药盒放在床头杯子旁',
      body: '与每日固定动作绑定（如早晨喝水），可显著提升依从性。',
      priority: 1,
    });
  }
  if (conditions.includes('hypertension')) {
    out.push({
      category: '饮食',
      emoji: '🍌',
      title: '每天一份富钾水果',
      body: '香蕉、橙子或猕猴桃。钾有助于平衡钠的升压作用。',
      priority: 3,
    });
  }
  if (conditions.includes('type2_diabetes')) {
    out.push({
      category: '监测',
      emoji: '📈',
      title: '每周记 2 天"三餐前 + 餐后"血糖',
      body: '即使指标平稳，也建议每月集中记一两天，及时发现波动。',
      priority: 3,
    });
  }

  // 兜底
  if (out.length === 0) {
    out.push({
      category: '活动',
      emoji: '🌿',
      title: '保持当前节奏，做得很棒',
      body: '继续按时吃药、规律运动、定期体检，数据保持稳定。',
      priority: 3,
    });
  }

  // 按优先级排，最多 6 条
  return out.sort((a, b) => a.priority - b.priority).slice(0, 6);
}
