import { LEAD_PRIORITY, type LeadPriority } from "@/types";

export const BUDGET_THRESHOLDS = {
  HIGH: 20_000_000,
  MEDIUM: 10_000_000,
} as const;

export const PRIORITY_SCORES = {
  [LEAD_PRIORITY.HIGH]: 100,
  [LEAD_PRIORITY.MEDIUM]: 50,
  [LEAD_PRIORITY.LOW]: 25,
} as const;

export interface LeadScoreFactors {
  budget: number;
  sourceQuality: number;
  engagementScore: number;
  daysSinceCreation: number;
}

export const calculateLeadScore = (factors: LeadScoreFactors): number => {
  let score = 0;

  score += getLeadPriority(factors.budget) === LEAD_PRIORITY.HIGH ? 40 : 0;
  score += getLeadPriority(factors.budget) === LEAD_PRIORITY.MEDIUM ? 20 : 0;
  score += factors.sourceQuality * 10;
  score += Math.min(factors.engagementScore, 20);
  score += Math.max(0, 30 - factors.daysSinceCreation);

  return Math.min(100, score);
};

export const getLeadPriority = (budget: number): LeadPriority => {
  if (budget > BUDGET_THRESHOLDS.HIGH) {
    return LEAD_PRIORITY.HIGH;
  }

  if (budget >= BUDGET_THRESHOLDS.MEDIUM) {
    return LEAD_PRIORITY.MEDIUM;
  }

  return LEAD_PRIORITY.LOW;
};
