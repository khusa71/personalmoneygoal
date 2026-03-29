"use client";

import { useMemo } from "react";
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  ReferenceLine, ReferenceDot,
  PieChart, Pie, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AppState } from "@/lib/store";
import type { FeasibilityResult, GoalDetail } from "@/types";
import {
  computeAllocations, computeGoalDetail, formatInr, formatInrFull,
  calculateTax, retirementCorpus, futureValue, simulateWaterfallRetirement,
  requiredMonthlySip,
} from "@/lib/financial-engine";
import { buildFundingPlan } from "@/lib/funding-plan";
import ScenarioLab from "@/components/scenario-lab";

interface DashboardProps {
  state: AppState;
}

const card = "rounded-sm ring-0 border border-zinc-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.03)] gap-0 py-0";
const cardHdr = "px-5 pt-4 pb-3";
const cardBody = "px-5 pb-4";

const DONUT_COLORS = ["#18181b", "#3f3f46", "#52525b", "#71717a", "#a1a1aa", "#292524", "#57534e", "#78716c"];

function crFmt(v: number) {
  if (v >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `${(v / 100000).toFixed(0)}L`;
  return `${(v / 1000).toFixed(0)}K`;
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function Dashboard({ state }: DashboardProps) {
  const currentYear = new Date().getFullYear();
  const { profile } = state;

  // ── Computed values ───────────────────────────────────────────────────────

  const totalMonthlyExpenses = useMemo(() => {
    let exp = profile.monthlyExpenses + state.lifestyleMonthly;
    if (state.parentsAtHome) exp += 15000;
    if (state.parentsSeparateSupport) exp += (state.parentsMonthlySupportAmount || 20000);
    if (state.inLawsDependent) exp += 12000;
    return exp;
  }, [profile.monthlyExpenses, state]);

  const adjustedProfile = useMemo(() => ({
    ...profile,
    monthlyExpenses: totalMonthlyExpenses,
  }), [profile, totalMonthlyExpenses]);

  const goalDetails: GoalDetail[] = useMemo(
    () => state.goals.filter(g => g.status === "active").map(g => computeGoalDetail(g, currentYear)),
    [state.goals, currentYear]
  );

  const fundingPlan = useMemo(
    () => buildFundingPlan(
      state.goals, currentYear,
      state.liquidSavings || 0,
      state.longTermPortfolio || 0,
      state.redeemablePortfolioPercent || 0,
      totalMonthlyExpenses,
      profile.age,
    ),
    [state.goals, currentYear, state.liquidSavings, state.longTermPortfolio, state.redeemablePortfolioPercent, totalMonthlyExpenses, profile.age],
  );

  const goalSipOverrides = useMemo(
    () => Object.fromEntries(fundingPlan.map(fp => [fp.goal.id, fp.monthlyCommitment])),
    [fundingPlan],
  );

  const result: FeasibilityResult = useMemo(
    () => computeAllocations(
      adjustedProfile, state.goals, currentYear, state.retirementAge,
      state.liquidSavings, state.existingInvestmentMonthly, goalSipOverrides,
    ),
    [adjustedProfile, state.goals, currentYear, state.retirementAge, state.liquidSavings, state.existingInvestmentMonthly, goalSipOverrides]
  );

  // Tax & income
  const annualTax = calculateTax(profile.annualIncome, profile.taxRegime);
  const spouseTax = profile.spouseIncome > 0 ? calculateTax(profile.spouseIncome, profile.taxRegime) : 0;
  const grossMonthly = Math.round((profile.annualIncome + profile.spouseIncome) / 12);
  const taxMonthly = Math.round((annualTax + spouseTax) / 12);
  const inHandMonthly = grossMonthly - taxMonthly;

  // Retirement
  const retireYears = Math.max(1, state.retirementAge - profile.age);
  const retirementYear = currentYear + retireYears;
  const baseCorpus = retirementCorpus(totalMonthlyExpenses, profile.age, state.retirementAge);
  const leftover = Math.max(0, result.monthlySurplus - result.totalIdealSip);

  // Emergency fund
  const efTarget = result.emergencyFundStatus.target;
  const efCurrent = result.emergencyFundStatus.current;
  const efPercent = efTarget > 0 ? Math.min(100, Math.round((efCurrent / efTarget) * 100)) : 100;

  // Portfolio projections
  const longTermAllocatedToGoals = fundingPlan.reduce((sum, fp) => sum + (fp.longTermAllocated || 0), 0);
  const unallocatedLongTerm = Math.max(0, state.longTermPortfolio - longTermAllocatedToGoals);
  const existingProjectedAtRetirement = futureValue(unallocatedLongTerm, 0.105, retireYears);

  const totalMonthlyInvesting = result.totalRequiredSip + state.existingInvestmentMonthly;

  // Donut data — actual allocations only
  const pieData = result.allocations
    .filter(a => a.monthlyAmount > 0)
    .map(a => ({ name: a.goalName, value: a.monthlyAmount }));
  if (result.emergencyFundStatus.monthlyContribution > 0) {
    pieData.unshift({ name: "Emergency Fund", value: result.emergencyFundStatus.monthlyContribution });
  }
  if (state.existingInvestmentMonthly > 0) {
    const insertAt = result.emergencyFundStatus.monthlyContribution > 0 ? 1 : 0;
    pieData.splice(insertAt, 0, { name: "Existing SIPs", value: state.existingInvestmentMonthly });
  }

  // Portfolio growth timeline — uses ALLOCATED SIPs (not ideal from funding plan)
  const portfolioTimeline = useMemo(() => {
    let value = state.longTermPortfolio;
    const annualReturn = 0.105;
    const retirementSip = result.retirementDetails.monthlySip;
    const efContrib = result.emergencyFundStatus.monthlyContribution;
    const efEndYear = efContrib > 0
      ? currentYear + Math.ceil(result.emergencyFundStatus.monthsToFull / 12)
      : currentYear - 1;

    const goalAllocMap = new Map(
      result.allocations
        .filter(a => a.goalId !== "__retirement__")
        .map(a => [a.goalId, a.monthlyAmount])
    );

    return Array.from({ length: retireYears + 1 }, (_, i) => {
      const year = currentYear + i;
      if (i > 0) {
        let yearMonthlySip = retirementSip + state.existingInvestmentMonthly;
        if (year <= efEndYear) yearMonthlySip += efContrib;
        for (const goal of state.goals) {
          if (goal.status !== "active") continue;
          const allocatedSip = goalAllocMap.get(goal.id) ?? 0;
          if (allocatedSip > 0 && year <= goal.targetYear) {
            yearMonthlySip += allocatedSip;
          }
        }
        value = value * (1 + annualReturn) + yearMonthlySip * 12;
      }
      const goalsThisYear = goalDetails.filter(g => g.targetYear === year);
      const withdrawal = goalsThisYear.reduce((sum, g) => sum + g.futureCost, 0);
      const beforeWithdrawal = value;
      value = Math.max(0, value - withdrawal);
      return {
        year,
        portfolio: Math.round(beforeWithdrawal),
        netOfGoals: Math.round(value),
        withdrawal: withdrawal > 0 ? Math.round(withdrawal) : undefined,
        goalLabels: goalsThisYear.map(g => g.name.split(" ")[0]).join("+"),
      };
    });
  }, [state.longTermPortfolio, state.existingInvestmentMonthly, result, state.goals, goalDetails, currentYear, retireYears]);

  const finalPortfolio = portfolioTimeline[portfolioTimeline.length - 1]?.portfolio ?? 0;

  // Waterfall retirement corpus — uses ALLOCATED SIPs
  const waterfallRetirementCorpus = useMemo(() => {
    const goalFreedSips = result.allocations
      .filter(a => {
        if (a.goalId === "__retirement__") return false;
        const goal = state.goals.find(g => g.id === a.goalId);
        return goal && !goal.isRecurring && a.monthlyAmount > 0 && goal.targetYear < retirementYear;
      })
      .map(a => {
        const goal = state.goals.find(g => g.id === a.goalId)!;
        return { targetYear: goal.targetYear, monthlyAmount: a.monthlyAmount };
      });
    return simulateWaterfallRetirement(
      result.retirementDetails.monthlySip,
      state.existingInvestmentMonthly,
      goalFreedSips,
      currentYear,
      retirementYear,
      0.11,
    );
  }, [result.allocations, result.retirementDetails.monthlySip, state.goals, state.existingInvestmentMonthly, currentYear, retirementYear]);

  // Waterfall schedule — using allocated SIPs
  const waterfallSchedule = useMemo(() => {
    const rows: { year: number; goalName: string; freed: number; cumulative: number }[] = [];
    let cumulativeSip = result.retirementDetails.monthlySip + state.existingInvestmentMonthly;
    const eligible = result.allocations
      .filter(a => {
        if (a.goalId === "__retirement__") return false;
        const goal = state.goals.find(g => g.id === a.goalId);
        return goal && !goal.isRecurring && a.monthlyAmount > 0 && goal.targetYear < retirementYear;
      })
      .map(a => {
        const goal = state.goals.find(g => g.id === a.goalId)!;
        return { goalName: a.goalName, targetYear: goal.targetYear, monthlyAmount: a.monthlyAmount };
      })
      .sort((a, b) => a.targetYear - b.targetYear);
    for (const item of eligible) {
      cumulativeSip += item.monthlyAmount;
      rows.push({ year: item.targetYear, goalName: item.goalName, freed: item.monthlyAmount, cumulative: cumulativeSip });
    }
    return rows;
  }, [result.allocations, result.retirementDetails.monthlySip, state.goals, state.existingInvestmentMonthly, retirementYear]);

  const withdrawalPoints = portfolioTimeline.filter(d => d.withdrawal !== undefined);

  // ── Plan table helpers ────────────────────────────────────────────────────

  const hasCorpusAllocations = fundingPlan.some(fp => (fp.liquidAllocated || 0) + (fp.longTermAllocated || 0) > 0);

  const idealRetirementSip = useMemo(
    () => requiredMonthlySip(baseCorpus, 0.11, retireYears),
    [baseCorpus, retireYears]
  );

  // Gap composition: per-goal underfunding breakdown
  const gapComposition = useMemo(() => {
    const gaps: { name: string; gap: number }[] = [];
    for (const alloc of result.allocations) {
      if (alloc.goalId === "__retirement__") {
        const gap = Math.max(0, idealRetirementSip - alloc.monthlyAmount);
        if (gap > 1000) gaps.push({ name: "Retirement", gap });
        continue;
      }
      const fp = fundingPlan.find(f => f.goal.id === alloc.goalId);
      const needed = fp?.monthlyCommitment ?? 0;
      const gap = Math.max(0, needed - alloc.monthlyAmount);
      if (gap > 500) gaps.push({ name: alloc.goalName, gap });
    }
    return gaps;
  }, [result.allocations, fundingPlan, idealRetirementSip]);

  // ── Next steps — specific, ranked actions ─────────────────────────────────

  const nextSteps = useMemo(() => {
    const steps: { text: string }[] = [];

    if (result.feasible) {
      const goalAllocs = result.allocations
        .filter(a => a.monthlyAmount > 0 && a.goalId !== "__retirement__")
        .map(a => {
          const g = goalDetails.find(gd => gd.id === a.goalId);
          return { ...a, year: g?.targetYear ?? 9999, yearsToGoal: g?.yearsToGoal ?? 0 };
        })
        .sort((a, b) => a.year - b.year);

      for (const a of goalAllocs) {
        steps.push({
          text: `${formatInrFull(a.monthlyAmount)}/mo in ${a.instrument} for ${a.goalName} (${a.yearsToGoal}yr horizon)`,
        });
      }

      const retAlloc = result.allocations.find(a => a.goalId === "__retirement__");
      if (retAlloc && retAlloc.monthlyAmount > 0) {
        steps.push({
          text: `${formatInrFull(retAlloc.monthlyAmount)}/mo in NPS + Index Fund for retirement (${retireYears}yr)`,
        });
      }

      if (leftover > 5000) {
        steps.push({
          text: `${formatInrFull(leftover)}/mo unallocated -- consider boosting retirement or building a larger cushion`,
        });
      }
    } else {
      const deferrableGoals = [...goalDetails]
        .filter(g => !g.isRecurring && g.category !== "retirement" && g.category !== "parents_medical")
        .sort((a, b) => b.targetYear - a.targetYear);

      if (deferrableGoals.length > 0) {
        const g = deferrableGoals[0];
        const fp = fundingPlan.find(f => f.goal.id === g.id);
        const currentSip = fp?.monthlyCommitment ?? g.requiredMonthlySip;
        const deferredDetail = computeGoalDetail(
          { ...g, targetYear: g.targetYear + 2 },
          currentYear,
        );
        const savings = Math.max(0, currentSip - deferredDetail.requiredMonthlySip);
        if (savings > 1000) {
          steps.push({
            text: `Defer ${g.name} from ${g.targetYear} to ${g.targetYear + 2} -- saves ~${formatInrFull(savings)}/mo`,
          });
        }
      }

      if (waterfallSchedule.length > 0) {
        const first = waterfallSchedule[0];
        steps.push({
          text: `When ${first.goalName} completes in ${first.year}, redirect ${formatInrFull(first.freed)}/mo to underfunded goals`,
        });
      }

      if (profile.spouseIncome === 0) {
        steps.push({ text: "Adding a second income would increase your surplus and close the gap" });
      }

      const pushYrs = 3;
      const pushedCorpus = retirementCorpus(totalMonthlyExpenses, profile.age, state.retirementAge + pushYrs);
      const pushedSip = requiredMonthlySip(pushedCorpus, 0.11, retireYears + pushYrs);
      const retSavings = Math.max(0, idealRetirementSip - pushedSip);
      if (retSavings > 5000) {
        steps.push({
          text: `Push retirement from ${state.retirementAge} to ${state.retirementAge + pushYrs} -- saves ~${formatInrFull(retSavings)}/mo in retirement SIP`,
        });
      }
    }

    return steps;
  }, [result, goalDetails, fundingPlan, waterfallSchedule, leftover, profile, state, currentYear, retireYears, idealRetirementSip, totalMonthlyExpenses]);

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">

      {/* ── 1. Verdict Banner ─────────────────────────────────────────── */}
      <Card
        className={card}
        style={{ borderLeft: `4px solid ${result.feasible ? "#10b981" : "#ef4444"}` }}
      >
        <CardContent className="px-5 py-5 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-0.5">Plan status</p>
            <h2 className="text-2xl font-black tracking-tight text-zinc-900">
              {result.feasible ? "The math works." : "You're short."}
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              {result.feasible
                ? `${goalDetails.length} goal${goalDetails.length === 1 ? "" : "s"} + retirement fully funded from ${formatInrFull(result.monthlySurplus)}/mo surplus`
                : (() => {
                    if (gapComposition.length > 0 && gapComposition.length <= 3) {
                      return gapComposition.map(g => `${g.name}: ${formatInrFull(g.gap)}`).join(" + ") + ` = ${formatInrFull(result.monthlyGap)}/mo gap`;
                    }
                    if (gapComposition.length > 3) {
                      return `${formatInrFull(result.monthlyGap)}/mo gap across ${gapComposition.length} underfunded goals`;
                    }
                    return `${formatInrFull(result.monthlyGap)}/mo gap -- adjust goals or defer retirement`;
                  })()}
            </p>
          </div>
          <div className="text-right shrink-0 ml-10">
            <Badge
              className="text-[9px] font-black uppercase tracking-[0.15em] border-0 mb-1"
              style={result.feasible
                ? { background: "#ecfdf5", color: "#059669" }
                : { background: "#fef2f2", color: "#dc2626" }}
            >
              {result.feasible ? "Feasible" : "Shortfall"}
            </Badge>
            <p
              className="text-3xl font-black tabular-nums leading-none"
              style={{ color: result.feasible ? "#10b981" : "#ef4444" }}
            >
              {result.feasible ? `+${formatInr(leftover)}` : `\u2212${formatInr(result.monthlyGap)}`}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">per month</p>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Cash Flow + Wealth Snapshot ────────────────────────────── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>

        {/* Monthly Cash Flow */}
        <Card className={card}>
          <CardHeader className={cardHdr}>
            <div className="flex items-center gap-3">
              <CardTitle className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 shrink-0">Monthly cash flow</CardTitle>
              <div className="h-px flex-1 bg-zinc-100" />
            </div>
          </CardHeader>
          <CardContent className={cardBody}>
            <div>
              <div className="flex justify-between items-baseline py-2 border-b border-zinc-50">
                <span className="text-[11px] text-zinc-500">Gross income</span>
                <span className="text-sm font-bold tabular-nums text-zinc-900">{formatInrFull(grossMonthly)}</span>
              </div>
              <div className="flex justify-between items-baseline py-2 border-b border-zinc-50 pl-3">
                <span className="text-[11px] text-zinc-400">{"\u2212"} Tax ({profile.taxRegime} regime)</span>
                <span className="text-sm tabular-nums text-red-400">{"\u2212"}{formatInrFull(taxMonthly)}</span>
              </div>
              <div className="flex justify-between items-baseline py-2 border-b border-zinc-100">
                <span className="text-[11px] font-bold text-zinc-700">= In-hand</span>
                <span className="text-sm font-extrabold tabular-nums text-zinc-900">{formatInrFull(inHandMonthly)}</span>
              </div>
              <div className="flex justify-between items-baseline py-2 border-b border-zinc-50 pl-3">
                <span className="text-[11px] text-zinc-400">{"\u2212"} Expenses + EMIs</span>
                <span className="text-sm tabular-nums text-red-400">{"\u2212"}{formatInrFull(totalMonthlyExpenses + profile.existingEmis)}</span>
              </div>
              <div className="flex justify-between items-baseline py-2 border-b border-zinc-100">
                <span className="text-[11px] font-bold text-zinc-700">= Monthly surplus</span>
                <span className={`text-sm font-extrabold tabular-nums ${result.monthlySurplus < 0 ? "text-red-500" : "text-zinc-900"}`}>
                  {formatInrFull(result.monthlySurplus)}
                </span>
              </div>
              {state.existingInvestmentMonthly > 0 && (
                <div className="flex justify-between items-baseline py-2 border-b border-zinc-50 pl-3">
                  <span className="text-[11px] text-zinc-400">{"\u2212"} Existing SIPs / investments</span>
                  <span className="text-sm tabular-nums text-red-400">{"\u2212"}{formatInrFull(state.existingInvestmentMonthly)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-[11px] font-bold text-zinc-700">= Available for goals</span>
                <span className="text-sm font-extrabold tabular-nums text-zinc-900">
                  {formatInrFull(Math.max(0, result.monthlySurplus - state.existingInvestmentMonthly))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wealth Snapshot */}
        <Card className={card}>
          <CardHeader className={cardHdr}>
            <div className="flex items-center gap-3">
              <CardTitle className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 shrink-0">Wealth snapshot</CardTitle>
              <div className="h-px flex-1 bg-zinc-100" />
            </div>
          </CardHeader>
          <CardContent className={cardBody}>
            <div className="space-y-4">

              {/* Emergency fund */}
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-amber-600 mb-0.5">Emergency fund</p>
                    <p className="text-lg font-extrabold tabular-nums text-zinc-900">{formatInrFull(efCurrent)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-zinc-400">Target (6 months)</p>
                    <p className="text-sm font-bold tabular-nums text-zinc-600">{formatInrFull(efTarget)}</p>
                  </div>
                </div>
                <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${efPercent}%` }} />
                </div>
              </div>

              <Separator className="bg-zinc-50" />

              {/* Investment corpus with earmark split */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-1">Investment corpus</p>
                <p className="text-lg font-extrabold tabular-nums text-zinc-900">
                  {state.longTermPortfolio > 0 ? formatInrFull(state.longTermPortfolio) : "\u2014"}
                </p>
                {state.longTermPortfolio > 0 && (state.redeemablePortfolioPercent || 0) > 0 && (
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    {state.redeemablePortfolioPercent}% earmarked for goals &middot; {100 - (state.redeemablePortfolioPercent || 0)}% stays compounding
                  </p>
                )}
                {state.longTermPortfolio > 0 && unallocatedLongTerm > 0 && (
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    ~{formatInr(existingProjectedAtRetirement)} at retirement if untouched (10.5% CAGR)
                  </p>
                )}
                {state.longTermPortfolio === 0 && (
                  <p className="text-[10px] text-zinc-400 mt-0.5">Everything will come from new SIPs</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Your Plan (unified goal table + donut) ─────────────────── */}
      <Card className={card}>
        <CardHeader className={`${cardHdr} border-b border-zinc-50`}>
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 shrink-0">
                Your plan
              </CardTitle>
              <div className="h-px w-16 bg-zinc-100" />
            </div>
            <p className="text-sm font-bold text-zinc-900">
              {goalDetails.length} goal{goalDetails.length !== 1 ? "s" : ""} + retirement &middot; {formatInrFull(totalMonthlyInvesting)}/mo
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">

          {/* Corpus deployment summary */}
          {hasCorpusAllocations && (
            <div className="px-5 py-3 bg-zinc-50/60 border-b border-zinc-100">
              <p className="text-[10px] text-zinc-500">
                Existing savings deployed: {formatInrFull(fundingPlan.reduce((s, fp) => s + (fp.savingsAllocated || 0), 0))} today
                {" \u2192 "}{formatInr(fundingPlan.reduce((s, fp) => s + (fp.savingsGrown || 0), 0))} at goal dates (nearest goals first, reducing SIPs needed)
              </p>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: pieData.length > 0 ? "220px 1fr" : "1fr" }}>

            {/* Donut sidebar */}
            {pieData.length > 0 && (
              <div className="border-r border-zinc-50 px-4 py-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-2">Allocation</p>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={34} outerRadius={52}
                      paddingAngle={1.5}
                      dataKey="value"
                      stroke="none"
                      startAngle={90} endAngle={-270}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(v) => [formatInrFull(Number(v)), ""]}
                      contentStyle={{ border: "1px solid #e4e4e7", borderRadius: "2px", fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {pieData.map((d, i) => {
                    const total = pieData.reduce((s, x) => s + x.value, 0);
                    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                    return (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                          <span className="text-[10px] text-zinc-500 truncate">{d.name}</span>
                        </div>
                        <span className="text-[10px] tabular-nums text-zinc-400 shrink-0 ml-2">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Goal table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="py-2.5 px-4 text-left text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">Goal</th>
                    <th className="py-2.5 pr-4 text-left text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">Year</th>
                    <th className="py-2.5 pr-4 text-left text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">Future cost</th>
                    {hasCorpusAllocations && (
                      <th className="py-2.5 pr-4 text-left text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">Corpus</th>
                    )}
                    <th className="py-2.5 pr-4 text-left text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">Monthly SIP</th>
                    <th className="py-2.5 pr-4 text-left text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">Instrument</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Emergency fund row */}
                  {result.emergencyFundStatus.monthlyContribution > 0 && (
                    <tr className="border-b border-zinc-50 hover:bg-zinc-50/40 transition-colors">
                      <td className="py-2.5 px-4">
                        <p className="text-sm font-bold text-amber-700">Emergency Fund</p>
                        <p className="text-[10px] text-zinc-400">{efPercent}% of target</p>
                      </td>
                      <td className="py-2.5 pr-4 text-sm tabular-nums text-zinc-400">
                        {result.emergencyFundStatus.monthsToFull > 0
                          ? `~${result.emergencyFundStatus.monthsToFull}mo`
                          : "\u2014"}
                      </td>
                      <td className="py-2.5 pr-4 text-sm tabular-nums text-zinc-700">{formatInrFull(efTarget)}</td>
                      {hasCorpusAllocations && <td className="py-2.5 pr-4 text-sm text-zinc-300">{"\u2014"}</td>}
                      <td className="py-2.5 pr-4 text-sm font-bold tabular-nums text-zinc-900">
                        {formatInrFull(result.emergencyFundStatus.monthlyContribution)}/mo
                      </td>
                      <td className="py-2.5 pr-4 text-[11px] text-zinc-400">Liquid Fund / Savings</td>
                    </tr>
                  )}

                  {/* Goal rows sorted by target year */}
                  {[...goalDetails].sort((a, b) => a.targetYear - b.targetYear).map((g) => {
                    const fp = fundingPlan.find(f => f.goal.id === g.id);
                    const alloc = result.allocations.find(a => a.goalId === g.id);
                    const corpusToday = fp?.savingsAllocated || 0;
                    const corpusGrown = fp?.savingsGrown || 0;
                    const needed = fp?.monthlyCommitment ?? g.requiredMonthlySip;
                    const allocated = alloc?.monthlyAmount ?? 0;
                    const isUnderfunded = needed > 0 && allocated < needed * 0.9;
                    const gap = Math.max(0, needed - allocated);

                    return (
                      <tr key={g.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/40 transition-colors">
                        <td className="py-2.5 px-4">
                          <p className="text-sm font-bold text-zinc-900">{g.name}</p>
                          {g.isRecurring && <p className="text-[10px] text-zinc-400">recurring</p>}
                        </td>
                        <td className="py-2.5 pr-4 text-sm tabular-nums text-zinc-700">{g.targetYear}</td>
                        <td className="py-2.5 pr-4">
                          <p className="text-sm font-bold tabular-nums text-zinc-900">{formatInrFull(g.futureCost)}</p>
                          <p className="text-[10px] tabular-nums text-zinc-400">{formatInrFull(g.todayCost)} today</p>
                        </td>
                        {hasCorpusAllocations && (
                          <td className="py-2.5 pr-4">
                            {corpusToday > 0 ? (
                              <>
                                <p className="text-sm tabular-nums text-zinc-700">{formatInr(corpusGrown)}</p>
                                <p className="text-[10px] tabular-nums text-zinc-400">{formatInr(corpusToday)} today</p>
                              </>
                            ) : (
                              <span className="text-sm text-zinc-300">{"\u2014"}</span>
                            )}
                          </td>
                        )}
                        <td className="py-2.5 pr-4">
                          {needed === 0 ? (
                            <span className="text-sm font-bold" style={{ color: "#059669" }}>Covered</span>
                          ) : (
                            <>
                              <p className={`text-sm font-bold tabular-nums ${isUnderfunded ? "text-red-600" : "text-zinc-900"}`}>
                                {formatInrFull(allocated)}/mo
                              </p>
                              {isUnderfunded && (
                                <p className="text-[10px] tabular-nums text-red-400">
                                  needs {formatInrFull(needed)} ({"\u2212"}{formatInrFull(gap)})
                                </p>
                              )}
                            </>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-[11px] text-zinc-400">{g.instrument}</td>
                      </tr>
                    );
                  })}

                  {/* Retirement row */}
                  {(() => {
                    const retAlloc = result.allocations.find(a => a.goalId === "__retirement__");
                    const allocated = retAlloc?.monthlyAmount ?? 0;
                    const isUnderfunded = allocated < idealRetirementSip * 0.9;
                    const gap = Math.max(0, idealRetirementSip - allocated);
                    return (
                      <tr className="border-t border-zinc-200 bg-zinc-50/40">
                        <td className="py-2.5 px-4">
                          <p className="text-sm font-bold text-zinc-900">Retirement</p>
                          <p className="text-[10px] text-zinc-400">{retireYears}yr &middot; 3.5% SWR</p>
                        </td>
                        <td className="py-2.5 pr-4 text-sm tabular-nums text-zinc-700">{retirementYear}</td>
                        <td className="py-2.5 pr-4">
                          <p className="text-sm font-bold tabular-nums text-zinc-900">{formatInr(baseCorpus)}</p>
                          <p className="text-[10px] tabular-nums text-zinc-400">corpus needed</p>
                        </td>
                        {hasCorpusAllocations && <td className="py-2.5 pr-4 text-sm text-zinc-300">{"\u2014"}</td>}
                        <td className="py-2.5 pr-4">
                          <p className={`text-sm font-bold tabular-nums ${isUnderfunded ? "text-red-600" : "text-zinc-900"}`}>
                            {formatInrFull(allocated)}/mo
                          </p>
                          {isUnderfunded && (
                            <p className="text-[10px] tabular-nums text-red-400">
                              needs {formatInrFull(idealRetirementSip)} ({"\u2212"}{formatInrFull(gap)})
                            </p>
                          )}
                          <p className="text-[10px] text-zinc-400 mt-0.5">steps up yearly with salary</p>
                        </td>
                        <td className="py-2.5 pr-4 text-[11px] text-zinc-400">NPS + Index Fund</td>
                      </tr>
                    );
                  })()}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-200">
                    <td colSpan={hasCorpusAllocations ? 4 : 3} className="py-2.5 px-4 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                      Total monthly investment
                    </td>
                    <td className="py-2.5 pr-4 text-sm font-extrabold tabular-nums text-zinc-900">
                      {formatInrFull(totalMonthlyInvesting)}/mo
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Existing SIPs note */}
          {state.existingInvestmentMonthly > 0 && (
            <div className="px-5 py-2.5 border-t border-zinc-50">
              <p className="text-[10px] text-zinc-400">
                Includes {formatInrFull(state.existingInvestmentMonthly)}/mo in existing SIPs already running (deducted from surplus before allocation)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 4. Portfolio Growth Chart ──────────────────────────────────── */}
      <Card className={card}>
        <CardHeader className={cardHdr}>
          <div className="flex items-center gap-3">
            <CardTitle className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 shrink-0">
              Portfolio growth
            </CardTitle>
            <div className="h-px flex-1 bg-zinc-100" />
            <span className="text-[9px] text-zinc-300 font-bold uppercase tracking-[0.15em] shrink-0">
              {formatInr(totalMonthlyInvesting)}/mo &middot; 10.5% CAGR
            </span>
          </div>
        </CardHeader>
        <CardContent className={cardBody}>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={portfolioTimeline} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#f4f4f5" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 10, fill: "#a1a1aa" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={crFmt}
                tick={{ fontSize: 10, fill: "#a1a1aa" }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <RechartsTooltip
                formatter={(v, name) => [
                  crFmt(Number(v)),
                  name === "portfolio" ? "Before goal payouts" : "After goal payouts",
                ]}
                labelFormatter={(l) => `${l}`}
                contentStyle={{ border: "1px solid #e4e4e7", borderRadius: "2px", fontSize: 11 }}
              />
              <ReferenceLine
                y={baseCorpus}
                stroke="#a1a1aa"
                strokeDasharray="4 2"
                label={{
                  value: `Need: ${formatInr(baseCorpus)}`,
                  position: "insideTopRight",
                  fontSize: 9,
                  fill: "#a1a1aa",
                }}
              />
              {withdrawalPoints.map(pt => (
                <ReferenceDot
                  key={pt.year}
                  x={pt.year}
                  y={pt.portfolio}
                  r={5}
                  fill="#ef4444"
                  stroke="#fff"
                  strokeWidth={1.5}
                  label={{
                    value: pt.goalLabels || "",
                    position: "top",
                    fontSize: 8,
                    fill: "#ef4444",
                  }}
                />
              ))}
              <Area
                type="monotone"
                dataKey="portfolio"
                fill="#e4e4e7"
                stroke="#18181b"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#18181b" }}
                name="portfolio"
              />
              <Area
                type="monotone"
                dataKey="netOfGoals"
                fill="transparent"
                stroke="#a1a1aa"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                name="netOfGoals"
              />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[9px] text-zinc-300 mt-2">
            Solid: portfolio value &middot; Dashed: after goal payouts &middot; Red dots: goal withdrawals &middot; Dashed line: retirement corpus needed
          </p>
        </CardContent>
      </Card>

      {/* ── 5. Retirement ─────────────────────────────────────────────── */}
      <Card className={card}>
        <CardHeader className={cardHdr}>
          <div className="flex items-center gap-3">
            <CardTitle className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 shrink-0">
              Retirement at {state.retirementAge}
            </CardTitle>
            <div className="h-px flex-1 bg-zinc-100" />
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-300 shrink-0">{retireYears} years away</span>
          </div>
        </CardHeader>
        <CardContent className={cardBody}>
          <div className="grid grid-cols-3 gap-6 mb-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-1.5">Corpus needed</p>
              <p className="text-lg font-extrabold tabular-nums text-zinc-900">{formatInr(baseCorpus)}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">3.5% SWR &middot; 30yr retirement</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-1.5">Your retirement SIP</p>
              <p className="text-lg font-extrabold tabular-nums text-zinc-900">
                {formatInrFull(result.retirementDetails.monthlySip)}/mo
              </p>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                {state.existingInvestmentMonthly > 0
                  ? `${formatInrFull(result.retirementDetails.monthlySip)} new + ${formatInrFull(state.existingInvestmentMonthly)} existing = ${formatInrFull(result.retirementDetails.monthlySip + state.existingInvestmentMonthly)} total`
                  : "NPS + Index Fund \u00B7 11% \u00B7 steps up yearly"}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-1.5">Projected at retirement</p>
              <p className="text-lg font-extrabold tabular-nums" style={{ color: finalPortfolio >= baseCorpus ? "#10b981" : "#ef4444" }}>
                {formatInr(finalPortfolio)}
              </p>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                {finalPortfolio >= baseCorpus
                  ? `+${formatInr(finalPortfolio - baseCorpus)} above target`
                  : `${formatInr(baseCorpus - finalPortfolio)} short of target`}
              </p>
            </div>
          </div>

          {/* Waterfall SIP schedule */}
          {waterfallSchedule.length > 0 && (
            <>
              <Separator className="bg-zinc-50 mb-3" />
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-2">
                SIP waterfall -- freed SIPs redirect to retirement as goals complete
              </p>
              <div className="space-y-1.5">
                <div className="flex items-baseline gap-3">
                  <span className="text-[10px] text-zinc-400 w-10 shrink-0">Now</span>
                  <span className="text-[10px] text-zinc-500">&mdash;</span>
                  <span className="text-[11px] font-bold tabular-nums text-zinc-900">
                    {formatInrFull(result.retirementDetails.monthlySip + state.existingInvestmentMonthly)}/mo
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    ({formatInrFull(result.retirementDetails.monthlySip)} new{state.existingInvestmentMonthly > 0 ? ` + ${formatInrFull(state.existingInvestmentMonthly)} existing` : ""})
                  </span>
                </div>
                {waterfallSchedule.map((row, i) => (
                  <div key={i} className="flex items-baseline gap-3">
                    <span className="text-[10px] text-zinc-400 w-10 shrink-0">{row.year}</span>
                    <span className="text-[10px] text-zinc-500">{row.goalName} done</span>
                    <span className="text-[10px] font-bold tabular-nums" style={{ color: "#10b981" }}>+{formatInrFull(row.freed)}</span>
                    <span className="text-[11px] font-bold tabular-nums text-zinc-900">&rarr; {formatInrFull(row.cumulative)}/mo</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── 6. Next Steps ─────────────────────────────────────────────── */}
      {nextSteps.length > 0 && (
        <Card className={card} style={{ borderLeft: `4px solid ${result.feasible ? "#10b981" : "#f59e0b"}` }}>
          <CardHeader className={cardHdr}>
            <div className="flex items-center gap-3">
              <CardTitle className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 shrink-0">
                {result.feasible ? "Start these SIPs" : "To close the gap"}
              </CardTitle>
              <div className="h-px flex-1 bg-zinc-100" />
            </div>
          </CardHeader>
          <CardContent className={cardBody}>
            <ol className="space-y-2">
              {nextSteps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-[11px] font-extrabold text-zinc-300 shrink-0 w-4 text-right">{i + 1}.</span>
                  <span className="text-[11px] text-zinc-600 leading-relaxed">{step.text}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* ── 7. What-If ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px w-6 bg-zinc-300" />
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 shrink-0">What-if analysis</span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>
        <ScenarioLab state={state} />
      </div>

      <p className="text-[9px] text-center text-zinc-300 uppercase tracking-[0.12em] pb-6">
        Based on historical averages &middot; Not financial advice &middot; Consult a SEBI-registered advisor
      </p>
    </div>
  );
}
