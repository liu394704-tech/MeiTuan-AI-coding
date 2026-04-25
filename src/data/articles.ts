import type { ConditionCode } from '@/types';

export interface HealthArticle {
  id: string;
  title: string;
  summary: string;
  content: string; // markdown-ish 简短文本
  tags: ConditionCode[];
  category: '科普' | '饮食' | '运动' | '用药' | '心理';
  emoji: string;
  readMinutes: number;
}

export const HEALTH_ARTICLES: HealthArticle[] = [
  {
    id: 'art_1',
    title: '清晨血压管理：起床后 1 小时内别忘了这 3 件事',
    summary: '清晨是血压"魔鬼时段"，做好 3 件事可显著降低脑卒中风险。',
    content:
      '一、起床动作慢三步（睁眼-坐起-站立）；\n二、温水送服降压药；\n三、静坐 5 分钟测一次血压。\n\n冬季更要注意保暖，避免血压剧烈波动。',
    tags: ['hypertension', 'coronary_heart_disease'],
    category: '用药',
    emoji: '🌅',
    readMinutes: 2,
  },
  {
    id: 'art_2',
    title: '糖尿病老人吃饭的"先后顺序"，比你想得更重要',
    summary: '同样的饭菜，先吃菜后吃饭，餐后血糖能低不少。',
    content:
      '推荐顺序：蔬菜 → 蛋白（肉/蛋）→ 主食。\n粗细搭配，主食里掺点燕麦、杂豆，对血糖很友好。\n吃饭速度放慢到 20 分钟以上，给胰岛素留出反应时间。',
    tags: ['type2_diabetes'],
    category: '饮食',
    emoji: '🥗',
    readMinutes: 3,
  },
  {
    id: 'art_3',
    title: '阿司匹林该饭前还是饭后？很多老人都搞反了',
    summary: '肠溶片的"肠溶"二字告诉你答案。',
    content:
      '阿司匹林肠溶片建议空腹服用（饭前 30 分钟），让药片更快通过胃部、在小肠溶解，减少胃黏膜刺激。\n如果出现胃痛、黑便，请立即就医。',
    tags: ['coronary_heart_disease'],
    category: '用药',
    emoji: '💊',
    readMinutes: 2,
  },
  {
    id: 'art_4',
    title: '每天散步 6000 步，帮你血压血糖一起降',
    summary: '不用追求 1 万步，6000 步快走是慢病老人的"黄金量"。',
    content:
      '中等速度（每分钟 100 步以上），分 2-3 次完成；\n餐后 30 分钟开始，对降糖效果最明显；\n膝盖不舒服时，可改为水中行走或踩自行车。',
    tags: ['hypertension', 'type2_diabetes', 'hyperlipidemia'],
    category: '运动',
    emoji: '🚶',
    readMinutes: 2,
  },
  {
    id: 'art_5',
    title: '家里常备这 5 样，慢病老人更安心',
    summary: '电子血压计、血糖仪、急救卡……一份适老应急清单。',
    content:
      '1. 上臂式电子血压计（袖带要合适）\n2. 血糖仪 + 试纸\n3. 硝酸甘油（冠心病者）\n4. 急救卡（写明疾病、用药、过敏史、家属电话）\n5. 老花镜 + 大字药盒分装',
    tags: ['hypertension', 'coronary_heart_disease', 'type2_diabetes', 'other'],
    category: '科普',
    emoji: '🏠',
    readMinutes: 3,
  },
  {
    id: 'art_6',
    title: '睡得好，血压自然稳：给老年朋友的 5 条睡眠建议',
    summary: '睡眠质量直接影响第二天的血压水平。',
    content:
      '晚 11 点前入睡；睡前 1 小时不刷手机；\n卧室温度 20-22℃；午睡控制在 30 分钟内；\n如果打鼾严重，建议做一次睡眠呼吸监测。',
    tags: ['hypertension', 'other'],
    category: '心理',
    emoji: '😴',
    readMinutes: 2,
  },
];

export const HEALTH_SLOGANS = [
  '按时吃药，不漏服，是控制慢病的第一步。',
  '清晨血压魔鬼时段，起床先静坐 5 分钟。',
  '少盐少油多蔬菜，每天散步 6000 步。',
  '家人的关心，是最好的良药。',
  '记得定期复诊，让医生帮您调整方案。',
  '慢病不可怕，规律生活就赢了一半。',
];

export function pickSloganOfTheDay(d = new Date()): string {
  const idx = Math.floor(d.getTime() / 86400000) % HEALTH_SLOGANS.length;
  return HEALTH_SLOGANS[idx];
}
