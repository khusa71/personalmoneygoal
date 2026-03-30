import type { Goal, GoalDetail } from "@/types";
import {
  computeGoalDetail, formatInr, formatInrFull,
  requiredStartingSip, requiredMonthlySip, calculateEmi,
} from "@/lib/financial-engine";

export type FundingStrategy = "income_only" | "sip" | "sip_and_corpus" | "sip_corpus_loan";

export interface GoalFunding {
  goal: Goal;
  detail: GoalDetail;
  strategy: FundingStrategy;
  monthlyCommitment: number;
  stepUpRate: number;
  savingsAllocated: number;       // total allocated from savings
  liquidAllocated: number;        // portion from liquid excess (FD overdraft)
  longTermAllocated: number;      // portion from long-term portfolio (dilution)
  savingsGrown: number;           // savingsAllocated grown to goal year at instrument return
  compoundingCost: number;        // opportunity cost of longTermAllocated vs staying in equity
  fundingLabel: string;
  loanAmount?: number;
  loanEmi?: number;
  loanLabel?: string;
}

export function getFundingStrategy(goal: Goal, yearsToGoal: number): FundingStrategy {
  if (goal.isRecurring) return "income_only";
  if (yearsToGoal <= 1 && goal.todayCost <= 200000) return "income_only";
  if (yearsToGoal <= 2 && goal.todayCost < 300000) return "income_only";
  if (goal.category === "house") return "sip_corpus_loan";
  if (goal.todayCost >= 500000) return "sip_and_corpus";
  return "sip";
}

export function salaryGrowthRate(age: number): number {
  if (age < 30) return 0.12;
  if (age < 38) return 0.08;
  if (age < 48) return 0.06;
  return 0.03;
}

export function sipStepUpRate(age: number): number {
  return Math.min(0.10, salaryGrowthRate(age));
}

export function surplusGrowthRate(age: number): number {
  return Math.max(0, salaryGrowthRate(age) - 0.06);
}

export function projectSurplus(current: number, age: number, years: number): number {
  let s = current;
  for (let y = 0; y < years; y++) s *= (1 + surplusGrowthRate(age + y));
  return s;
}

export function yearsUntilSurplusCovers(current: number, needed: number, age: number): number | null {
  if (current >= needed) return 0;
  for (let y = 1; y <= 15; y++) {
    if (projectSurplus(current, age, y) >= needed) return y;
  }
  return null;
}

export function buildFundingPlan(
  goals: Goal[],
  currentYear: number,
  liquidSavings: number,
  longTermPortfolio: number,
  redeemablePortfolioPercent: number,
  monthlyExpenses: number,
  userAge: number,
): GoalFunding[] {
  if (goals.length === 0) return [];

  const active = goals.filter(g => g.status === "active");
  const stepUp = sipStepUpRate(userAge);

  // Compute available buckets
  const emergencyTarget = monthlyExpenses * 6;
  const liquidExcess = Math.max(0, liquidSavings - emergencyTarget);
  const longTermRedeemable = longTermPortfolio * (redeemablePortfolioPercent / 100);

  const classified = active.map(g => {
    const detail = computeGoalDetail({ ...g, existingCorpus: 0 }, currentYear);
    return { goal: g, detail, strategy: getFundingStrategy(g, detail.yearsToGoal) };
  });

  let liquidRemaining = liquidExcess;
  let longTermRemaining = longTermRedeemable;

  const liquidMap: Record<string, number> = {};
  const longTermMap: Record<string, number> = {};

  // Unified pool allocation: ALL non-income-only goals + vacation goals, nearest-to-farthest.
  // Vacation goals are "income_only" by strategy but their near-term occurrence should eat
  // liquid excess first — the same logic as any short-horizon goal.
  // Non-discretionary recurring goals (parents_medical, custom recurring) stay income-only.
  const allEligible = classified
    .filter(c => c.strategy !== "income_only" || c.goal.category === "vacation")
    .sort((a, b) => a.detail.yearsToGoal - b.detail.yearsToGoal);

  for (const c of allEligible) {
    if (liquidRemaining <= 0 && longTermRemaining <= 0) break;
    const growthFactor = c.detail.yearsToGoal > 0
      ? Math.pow(1 + c.detail.returnRate, c.detail.yearsToGoal) : 1;
    const pvNeeded = c.detail.futureCost / growthFactor;

    // Draw from liquid first (FD/savings compounding < equity return, so spend liquid first)
    const fromLiquid = Math.min(liquidRemaining, pvNeeded);
    liquidRemaining -= fromLiquid;

    // Then draw from long-term if still needed
    const fromLongTerm = Math.min(longTermRemaining, pvNeeded - fromLiquid);
    longTermRemaining -= fromLongTerm;

    if (fromLiquid > 0) liquidMap[c.goal.id] = Math.round(fromLiquid);
    if (fromLongTerm > 0) longTermMap[c.goal.id] = Math.round(fromLongTerm);
  }

  return classified.map(({ goal, detail, strategy }) => {
    const liquidSaved = liquidMap[goal.id] || 0;
    const longTermSaved = longTermMap[goal.id] || 0;
    const savings = liquidSaved + longTermSaved;

    if (strategy === "income_only") {
      if (goal.isRecurring) {
        // Vacation (and other eligible recurring goals) may have received liquid corpus above.
        // Use it to reduce or eliminate the monthly SIP for this occurrence.
        if (liquidSaved > 0) {
          const growthFactor = detail.yearsToGoal > 0
            ? Math.pow(1 + detail.returnRate, detail.yearsToGoal) : 1;
          const savingsGrown = Math.round(liquidSaved * growthFactor);
          const gap = Math.max(0, detail.futureCost - savingsGrown);
          const months = Math.max(1, detail.yearsToGoal * 12);
          const monthly = gap > 0 ? Math.round(gap / months) : 0;
          const sipLabel = monthly > 0 ? ` + ${formatInrFull(monthly)}/mo gap` : " (fully covered)";
          return {
            goal, detail, strategy,
            monthlyCommitment: monthly,
            stepUpRate: 0,
            savingsAllocated: liquidSaved, liquidAllocated: liquidSaved, longTermAllocated: 0,
            savingsGrown, compoundingCost: 0,
            fundingLabel: `${formatInr(liquidSaved)} liquid savings${sipLabel}`,
          };
        }
        // No corpus — fund from income.
        // Use inflation-adjusted first-year cost so the set-aside keeps pace with inflation.
        const monthly = Math.round(detail.futureCost / 12);
        return {
          goal, detail, strategy,
          monthlyCommitment: monthly,
          stepUpRate: 0,
          savingsAllocated: 0, liquidAllocated: 0, longTermAllocated: 0,
          savingsGrown: 0, compoundingCost: 0,
          fundingLabel: `${formatInrFull(monthly)}/mo from income (inflation-adjusted)`,
        };
      }
      // Non-recurring income_only goal — use liquid allocation if available
      if (liquidSaved > 0) {
        const growthFactor = detail.yearsToGoal > 0
          ? Math.pow(1 + detail.returnRate, detail.yearsToGoal) : 1;
        const savingsGrown = Math.round(liquidSaved * growthFactor);
        const gap = Math.max(0, detail.futureCost - savingsGrown);
        const months = Math.max(1, detail.yearsToGoal * 12);
        const monthly = gap > 0 ? Math.round(gap / months) : 0;
        const sipLabel = monthly > 0 ? ` + ${formatInrFull(monthly)}/mo` : " (fully covered)";
        return {
          goal, detail, strategy,
          monthlyCommitment: monthly,
          stepUpRate: 0,
          savingsAllocated: liquidSaved, liquidAllocated: liquidSaved, longTermAllocated: 0,
          savingsGrown, compoundingCost: 0,
          fundingLabel: `${formatInr(liquidSaved)} (liquid)${sipLabel}`,
        };
      }
      // No corpus available — simple income savings
      const months = Math.max(1, detail.yearsToGoal * 12);
      const monthly = Math.round(goal.todayCost / months);
      return {
        goal, detail, strategy,
        monthlyCommitment: monthly,
        stepUpRate: 0,
        savingsAllocated: 0, liquidAllocated: 0, longTermAllocated: 0,
        savingsGrown: 0, compoundingCost: 0,
        fundingLabel: `${formatInrFull(monthly)}/mo from income`,
      };
    }

    const growthFactor = detail.yearsToGoal > 0
      ? Math.pow(1 + detail.returnRate, detail.yearsToGoal) : 1;
    const savingsGrown = Math.round(savings * growthFactor);
    const gap = Math.max(0, detail.futureCost - savingsGrown);

    const EQUITY_RETURN = 0.12;
    const compoundingCost = longTermSaved > 0 && detail.yearsToGoal > 0
      ? Math.max(0, Math.round(
          longTermSaved * (Math.pow(1 + EQUITY_RETURN, detail.yearsToGoal) - Math.pow(1 + detail.returnRate, detail.yearsToGoal))
        ))
      : 0;

    const useStepUp = detail.yearsToGoal >= 3;
    let startingSip: number;
    if (gap <= 0) {
      startingSip = 0;
    } else if (useStepUp) {
      startingSip = Math.round(requiredStartingSip(gap, detail.returnRate, detail.yearsToGoal, stepUp));
    } else {
      startingSip = Math.round(requiredMonthlySip(gap, detail.returnRate, detail.yearsToGoal));
    }

    const detailWithCorpus = savings > 0
      ? computeGoalDetail({ ...goal, existingCorpus: savings }, currentYear)
      : detail;

    const sipLabel = useStepUp && startingSip > 0
      ? `${formatInrFull(startingSip)}/mo SIP (+${Math.round(stepUp * 100)}%/yr)`
      : startingSip > 0
        ? `${formatInrFull(startingSip)}/mo SIP`
        : "";

    let fundingLabel: string;
    if (liquidSaved > 0 && longTermSaved > 0 && startingSip > 0) {
      fundingLabel = `${formatInr(liquidSaved)} (liquid) + ${formatInr(longTermSaved)} (portfolio) + ${sipLabel}`;
    } else if (liquidSaved > 0 && longTermSaved > 0) {
      fundingLabel = `${formatInr(liquidSaved)} (liquid) + ${formatInr(longTermSaved)} (portfolio)`;
    } else if (liquidSaved > 0 && startingSip > 0) {
      fundingLabel = `${formatInr(liquidSaved)} from liquid savings + ${sipLabel}`;
    } else if (longTermSaved > 0 && startingSip > 0) {
      fundingLabel = `${formatInr(longTermSaved)} from portfolio + ${sipLabel}`;
    } else if (liquidSaved > 0) {
      fundingLabel = `Covered from liquid savings (FD overdraft)`;
    } else if (longTermSaved > 0) {
      fundingLabel = `Covered from portfolio (partial redemption)`;
    } else {
      fundingLabel = sipLabel || "No SIP needed";
    }

    let loanAmount: number | undefined;
    let loanEmi: number | undefined;
    let loanLabel: string | undefined;
    if (strategy === "sip_corpus_loan") {
      // todayCost is down payment (20% of property), so property = todayCost / 0.20
      // futureCost is the inflation-adjusted down payment
      const propertyFuture = detail.futureCost / 0.20;
      loanAmount = Math.round(propertyFuture * 0.80);
      loanEmi = Math.round(calculateEmi(loanAmount, 0.085, 20));
      loanLabel = `Home loan ${formatInr(loanAmount)} at 8.5% → ${formatInrFull(loanEmi)}/mo EMI for 20yr`;
    }

    return {
      goal,
      detail: detailWithCorpus,
      strategy,
      monthlyCommitment: startingSip,
      stepUpRate: useStepUp ? stepUp : 0,
      savingsAllocated: savings,
      liquidAllocated: liquidSaved,
      longTermAllocated: longTermSaved,
      savingsGrown,
      compoundingCost,
      fundingLabel,
      loanAmount, loanEmi, loanLabel,
    };
  });
}
