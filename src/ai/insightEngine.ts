import type {
  FollowUp,
  Insight,
  Inventory,
  Medication,
  MedicationEvent,
  Regimen,
  User,
} from '@/types';
import { adherenceRule } from './rules/adherenceRule';
import { stockRule } from './rules/stockRule';
import { riskRule } from './rules/riskRule';
import { tipRule } from './rules/tipRule';

export interface RuleContext {
  user: User;
  medications: Medication[];
  regimens: Regimen[];
  inventory: Inventory[];
  events: MedicationEvent[];
  followUps: FollowUp[];
  now: Date;
}

export interface InsightRule {
  id: string;
  run(ctx: RuleContext): Insight[];
}

const RULES: InsightRule[] = [adherenceRule, stockRule, riskRule, tipRule];

const LEVEL_WEIGHT = { danger: 0, warn: 1, info: 2 } as const;
const TYPE_WEIGHT = { risk: 0, stock: 1, adherence: 2, tip: 3 } as const;

export function runInsights(ctx: RuleContext): Insight[] {
  const all = RULES.flatMap((r) => r.run(ctx));
  // Dedup by title
  const seen = new Set<string>();
  const dedup: Insight[] = [];
  for (const i of all) {
    if (seen.has(i.title)) continue;
    seen.add(i.title);
    dedup.push(i);
  }
  // Sort: danger first, then warn, info; secondary by type ranking
  dedup.sort(
    (a, b) =>
      LEVEL_WEIGHT[a.level] - LEVEL_WEIGHT[b.level] ||
      TYPE_WEIGHT[a.type] - TYPE_WEIGHT[b.type]
  );
  // Cap at 6 cards to avoid noise
  return dedup.slice(0, 6);
}
