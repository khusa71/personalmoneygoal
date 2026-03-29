"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AppState } from "@/lib/store";
import type { FeasibilityResult } from "@/types";
import { computeAllocations, computeGoalDetail, projectTotalWealthAtRetirement, formatInr, formatInrFull } from "@/lib/financial-engine";
import { buildFundingPlan } from "@/lib/funding-plan";

interface ScenarioLabProps {
  state: AppState;
}

interface Scenario {
  name: string;
  spouseIncome: number;
  salaryGrowth: number | undefined;
  retirementAge: number;
  monthlyExpenses: number;
  liquidSavingsOverride?: number;
}

const card = "rounded-sm ring-0 border border-zinc-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.03)] gap-0 py-0";

/**
 * Generate specific, actionable suggestions for a scenario.
 * Positive scenarios get surplus-allocation advice; negative ones get specific fixes.
 */
function generateScenarioSuggestions(
  scenarioName: string,
  result: FeasibilityResult,
  baseResult: FeasibilityResult,
  existingInvestmentMonthly: number,
): string[] {
  const suggestions: string[] = [];
  const available = result.monthlySurplus - existingInvestmentMonthly;
  const buffer = available - result.totalIdealSip;

  // Positive scenario — has surplus
  if (buffer > 0) {
    const underfundedInBase = baseResult.allocations.filter(
      a => a.neededAmount > a.monthlyAmount && a.neededAmount - a.monthlyAmount > 100,
    );
    if (underfundedInBase.length > 0) {
      const topGap = underfundedInBase.sort((a, b) => (b.neededAmount - b.monthlyAmount) - (a.neededAmount - a.monthlyAmount))[0];
      suggestions.push(
        `Allocate ${formatInr(Math.min(buffer, topGap.neededAmount - topGap.monthlyAmount))} of the ${formatInr(buffer)} buffer to fully fund ${topGap.goalName}.`,
      );
    }
    const retireAlloc = result.allocations.find(a => a.goalId === "__retirement__");
    if (retireAlloc && retireAlloc.monthlyAmount < retireAlloc.neededAmount) {
      const retireGap = retireAlloc.neededAmount - retireAlloc.monthlyAmount;
      suggestions.push(
        `Boost retirement SIP by ${formatInr(Math.min(buffer, retireGap))} to close the retirement gap.`,
      );
    }
    if (suggestions.length === 0) {
      suggestions.push(`${formatInr(buffer)}/mo buffer available. Consider building a larger emergency fund or investing in index funds.`);
    }
    return suggestions;
  }

  // Negative scenario — has gap
  const underfunded = result.allocations
    .filter(a => a.neededAmount > a.monthlyAmount && a.neededAmount - a.monthlyAmount > 100)
    .sort((a, b) => (b.neededAmount - b.monthlyAmount) - (a.neededAmount - a.monthlyAmount));

  if (underfunded.length > 0) {
    for (const a of underfunded.slice(0, 2)) {
      suggestions.push(
        `${a.goalName} underfunded by ${formatInr(a.neededAmount - a.monthlyAmount)}/mo (needs ${formatInrFull(a.neededAmount)}, gets ${formatInrFull(a.monthlyAmount)}).`,
      );
    }
  }

  // Scenario-specific advice
  if (scenarioName.includes("Laid off")) {
    suggestions.push("Rebuild emergency fund first after re-employment. Goal timelines shift by ~12-18 months.");
  } else if (scenarioName.includes("Slow growth")) {
    suggestions.push("Lower returns mean higher SIPs needed. Consider increasing equity allocation in early years.");
  } else if (scenarioName.includes("Extra kid")) {
    suggestions.push("Reduce discretionary expenses or defer the most distant goal by 2-3 years to absorb the cost.");
  } else if (scenarioName.includes("Retire at")) {
    const retireAlloc = result.allocations.find(a => a.goalId === "__retirement__");
    if (retireAlloc && retireAlloc.neededAmount > retireAlloc.monthlyAmount) {
      suggestions.push(
        `Retirement needs ${formatInrFull(retireAlloc.neededAmount)}/mo but gets ${formatInrFull(retireAlloc.monthlyAmount)}. Push retirement by 3 years to save ~30-50L in corpus.`,
      );
    }
  }

  if (suggestions.length === 0) {
    suggestions.push(`Short by ${formatInr(Math.abs(buffer))}/mo. Defer the most distant goal or add spouse income.`);
  }

  return suggestions;
}

export default function ScenarioLab({ state }: ScenarioLabProps) {
  const currentYear = new Date().getFullYear();

  const totalExpenses = useMemo(() => {
    let exp = state.profile.monthlyExpenses + state.lifestyleMonthly;
    if (state.parentsAtHome) exp += 15000;
    if (state.parentsSeparateSupport) exp += (state.parentsMonthlySupportAmount || 20000);
    if (state.inLawsDependent) exp += 12000;
    return exp;
  }, [state]);

  // Dynamic "Retire at X" — if user already retires at 50, show 55 instead (and vice versa)
  const retireScenarioAge = state.retirementAge <= 50 ? state.retirementAge + 5 : 50;

  const scenarios: Scenario[] = useMemo(() => [
    {
      name: "Base Case",
      spouseIncome: state.profile.spouseIncome,
      salaryGrowth: undefined,
      retirementAge: state.retirementAge,
      monthlyExpenses: totalExpenses,
    },
    {
      name: state.profile.spouseIncome > 0 ? "Spouse works (+₹15L)" : "Spouse works (₹15L)",
      spouseIncome: state.profile.spouseIncome > 0
        ? state.profile.spouseIncome + 1500000
        : 1500000,
      salaryGrowth: undefined,
      retirementAge: state.retirementAge,
      monthlyExpenses: totalExpenses,
    },
    {
      name: "Extra kid (+₹25K/mo)",
      spouseIncome: state.profile.spouseIncome,
      salaryGrowth: undefined,
      retirementAge: state.retirementAge,
      monthlyExpenses: totalExpenses + 25000,
    },
    {
      name: `Retire at ${retireScenarioAge}`,
      spouseIncome: state.profile.spouseIncome,
      salaryGrowth: undefined,
      retirementAge: retireScenarioAge,
      monthlyExpenses: totalExpenses,
    },
    {
      name: "Laid off 6 months",
      spouseIncome: state.profile.spouseIncome,
      salaryGrowth: undefined,
      retirementAge: state.retirementAge,
      monthlyExpenses: totalExpenses,
      // Drain emergency fund by 6 months of expenses
      liquidSavingsOverride: Math.max(0, (state.liquidSavings || 0) - totalExpenses * 6),
    },
    {
      name: "Slow growth (5%/yr)",
      spouseIncome: state.profile.spouseIncome,
      salaryGrowth: 0.05,
      retirementAge: state.retirementAge,
      monthlyExpenses: totalExpenses,
    },
  ], [state, totalExpenses, retireScenarioAge]);

  const goalDetails = useMemo(() => {
    return state.goals.filter(g => g.status === "active").map(g => computeGoalDetail(g, currentYear));
  }, [state.goals, currentYear]);

  const results = useMemo(() => {
    return scenarios.map((scenario) => {
      const adjustedProfile = {
        ...state.profile,
        spouseIncome: scenario.spouseIncome,
        monthlyExpenses: scenario.monthlyExpenses,
        salaryGrowthOverride: scenario.salaryGrowth,
      };

      const scenarioLiquidSavings = scenario.liquidSavingsOverride ?? (state.liquidSavings || 0);

      // Run the FULL pipeline: funding plan → SIP overrides → allocation engine.
      // This ensures the stress test uses the same computation path as the main dashboard.
      const fp = buildFundingPlan(
        state.goals, currentYear,
        scenarioLiquidSavings,
        state.longTermPortfolio || 0,
        state.redeemablePortfolioPercent || 0,
        scenario.monthlyExpenses,
        adjustedProfile.age,
      );
      const goalSipOverrides = Object.fromEntries(fp.map(f => [f.goal.id, f.monthlyCommitment]));

      const result = computeAllocations(
        adjustedProfile,
        state.goals,
        currentYear,
        scenario.retirementAge,
        scenarioLiquidSavings,
        state.existingInvestmentMonthly,
        goalSipOverrides,
      );

      // Full portfolio projection: existing portfolio growth + all SIPs - goal withdrawals
      const retirementYear = currentYear + Math.max(1, scenario.retirementAge - state.profile.age);
      const projectedWealth = projectTotalWealthAtRetirement(
        state.longTermPortfolio || 0,
        state.existingInvestmentMonthly,
        result.allocations,
        state.goals,
        goalDetails,
        currentYear,
        retirementYear,
      );

      return { scenario, result, projectedWealth };
    });
  }, [scenarios, state, currentYear, goalDetails]);

  const baseResult = results[0]?.result;

  return (
    <Card className={card}>
      <CardHeader className="px-5 pt-4 pb-3">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 shrink-0">
              Stress test · {scenarios.length} scenarios
            </CardTitle>
            <div className="h-px w-16 bg-zinc-100" />
          </div>
          <p className="text-sm font-bold text-zinc-900">Same goals · Different life circumstances</p>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-b border-zinc-100">
                {["Scenario", "Monthly surplus", "SIP needed", "Gap / Buffer", "Wealth at retire", ""].map((h) => (
                  <th key={h} className="px-5 py-2.5 text-left text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map(({ scenario, result, projectedWealth }, i) => {
                const available = result.monthlySurplus - state.existingInvestmentMonthly;
                const buffer = available - result.totalIdealSip;
                const isBase = i === 0;
                const baseWealth = results[0]?.projectedWealth ?? 0;
                const corpusDelta = isBase ? 0 : projectedWealth - baseWealth;

                // Laid-off annotation
                const isLaidOff = scenario.name.includes("Laid off");
                const efDrain = isLaidOff ? Math.min(state.liquidSavings || 0, totalExpenses * 6) : 0;

                return (
                  <tr
                    key={i}
                    className={`border-b border-zinc-50 last:border-0 transition-colors ${
                      isBase ? "bg-zinc-50/60" : "hover:bg-zinc-50/40"
                    }`}
                  >
                    {/* Name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-sm text-zinc-900 ${isBase ? "font-extrabold" : "font-medium"}`}>
                          {scenario.name}
                        </span>
                        {isBase && (
                          <Badge
                            variant="secondary"
                            className="text-[8px] font-black uppercase tracking-[0.12em] px-1.5 py-0 h-4 bg-zinc-100 text-zinc-500 rounded-[2px]"
                          >
                            Base
                          </Badge>
                        )}
                      </div>
                      {isLaidOff && efDrain > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          <li className="text-[10px] text-zinc-400 flex gap-1">
                            <span className="text-zinc-300">--</span>
                            <span>6-mo gap drains {formatInr(efDrain)} from emergency fund</span>
                          </li>
                          <li className="text-[10px] text-zinc-400 flex gap-1">
                            <span className="text-zinc-300">--</span>
                            <span>Less liquid savings means higher SIPs for near-term goals</span>
                          </li>
                        </ul>
                      )}
                    </td>

                    {/* Monthly surplus */}
                    <td className="px-5 py-3 text-sm tabular-nums text-zinc-700">
                      {formatInrFull(result.monthlySurplus)}
                      {!isBase && result.monthlySurplus !== baseResult?.monthlySurplus && (
                        <p
                          className="text-[10px] tabular-nums font-medium mt-0.5"
                          style={{ color: (result.monthlySurplus - (baseResult?.monthlySurplus ?? 0)) >= 0 ? "#10b981" : "#ef4444" }}
                        >
                          {(result.monthlySurplus - (baseResult?.monthlySurplus ?? 0)) >= 0 ? "+" : "-"}
                          {formatInr(Math.abs(result.monthlySurplus - (baseResult?.monthlySurplus ?? 0)))} vs base
                        </p>
                      )}
                    </td>

                    {/* SIP needed (ideal, corpus-adjusted) */}
                    <td className="px-5 py-3 text-sm tabular-nums text-zinc-700">
                      {formatInrFull(result.totalIdealSip)}
                      {!isBase && result.totalIdealSip !== baseResult?.totalIdealSip && (
                        <p
                          className="text-[10px] tabular-nums font-medium mt-0.5"
                          style={{ color: (result.totalIdealSip - (baseResult?.totalIdealSip ?? 0)) <= 0 ? "#10b981" : "#ef4444" }}
                        >
                          {(result.totalIdealSip - (baseResult?.totalIdealSip ?? 0)) >= 0 ? "+" : "-"}
                          {formatInr(Math.abs(result.totalIdealSip - (baseResult?.totalIdealSip ?? 0)))} vs base
                        </p>
                      )}
                    </td>

                    {/* Gap / Buffer */}
                    <td className="px-5 py-3">
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color: buffer >= 0 ? "#10b981" : "#ef4444" }}
                      >
                        {buffer >= 0 ? "+" : "-"}{formatInrFull(Math.abs(buffer))}
                      </span>
                    </td>

                    {/* Retire corpus */}
                    <td className="px-5 py-3">
                      <p className="text-sm tabular-nums text-zinc-700">
                        {formatInrFull(projectedWealth)}
                      </p>
                      {!isBase && corpusDelta !== 0 && (
                        <p
                          className="text-[10px] tabular-nums font-medium mt-0.5"
                          style={{ color: corpusDelta >= 0 ? "#10b981" : "#ef4444" }}
                        >
                          {corpusDelta >= 0 ? "+" : "-"}{formatInr(Math.abs(corpusDelta))} vs base
                        </p>
                      )}
                    </td>

                    {/* Verdict */}
                    <td className="px-5 py-3">
                      <Badge
                        className="text-[9px] font-black uppercase tracking-[0.12em] border-0 rounded-[2px]"
                        style={result.feasible
                          ? { background: "#ecfdf5", color: "#059669" }
                          : { background: "#fef2f2", color: "#dc2626" }}
                      >
                        {result.feasible ? "OK" : "Short"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Per-scenario suggestions — unique and actionable */}
        {results.length > 1 && (
          <>
            <Separator className="bg-zinc-50" />
            <div className="px-5 py-4 space-y-4">
              {results.slice(1).map(({ scenario, result }, i) => {
                const suggestions = generateScenarioSuggestions(
                  scenario.name, result, baseResult, state.existingInvestmentMonthly,
                );
                if (suggestions.length === 0) return null;
                const available = result.monthlySurplus - state.existingInvestmentMonthly;
                const buffer = available - result.totalIdealSip;
                return (
                  <div key={i}>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2"
                       style={{ color: buffer >= 0 ? "#059669" : "#a1a1aa" }}>
                      {scenario.name}
                    </p>
                    <ul className="space-y-1">
                      {suggestions.map((s, j) => (
                        <li key={j} className="text-[11px] text-zinc-500 flex gap-2">
                          <span className="text-zinc-300 shrink-0">--</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
