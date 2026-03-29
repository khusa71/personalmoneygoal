"use client";

import type { FeasibilityResult } from "@/types";
import type { Goal } from "@/types";
import { formatInrFull } from "@/lib/financial-engine";

interface FeasibilityBarProps {
  result: FeasibilityResult;
  goals: Goal[];
  currentYear: number;
}

interface ConflictWarning {
  type: "overlap" | "heavy_single" | "over_budget";
  message: string;
}

function detectConflicts(goals: Goal[], result: FeasibilityResult, currentYear: number): ConflictWarning[] {
  const warnings: ConflictWarning[] = [];

  // Multiple expensive goals in same year
  const byYear: Record<number, Goal[]> = {};
  for (const g of goals) {
    if (g.status !== "active") continue;
    if (!byYear[g.targetYear]) byYear[g.targetYear] = [];
    byYear[g.targetYear].push(g);
  }
  for (const [year, yearGoals] of Object.entries(byYear)) {
    const big = yearGoals.filter((g) => g.todayCost > 500000);
    if (big.length >= 2) {
      warnings.push({
        type: "overlap",
        message: `${big.length} major goals in ${year}: ${big.map((g) => g.name).join(", ")}. Consider spacing them out.`,
      });
    }
  }

  // Single goal taking >40% of surplus
  for (const alloc of result.allocations) {
    if (result.monthlySurplus > 0 && alloc.monthlyAmount > result.monthlySurplus * 0.4) {
      warnings.push({
        type: "heavy_single",
        message: `${alloc.goalName} alone takes ${Math.round((alloc.monthlyAmount / result.monthlySurplus) * 100)}% of your surplus.`,
      });
    }
  }

  // Over budget
  if (result.monthlyGap > 0) {
    warnings.push({
      type: "over_budget",
      message: `You're over budget by ${formatInrFull(result.monthlyGap)}/month. Some goals will be underfunded.`,
    });
  }

  return warnings;
}

export default function FeasibilityBar({ result, goals, currentYear }: FeasibilityBarProps) {
  const totalAllocated = result.allocations.reduce((sum, a) => sum + a.monthlyAmount, 0)
    + result.emergencyFundStatus.monthlyContribution;
  const surplus = result.monthlySurplus;
  const percent = surplus > 0 ? Math.min(100, Math.round((totalAllocated / surplus) * 100)) : 0;

  const barColor = percent <= 80
    ? "bg-green-500"
    : percent <= 100
      ? "bg-amber-500"
      : "bg-red-500";

  const textColor = percent <= 80
    ? "text-green-600"
    : percent <= 100
      ? "text-amber-600"
      : "text-red-600";

  const conflicts = detectConflicts(goals, result, currentYear);

  return (
    <div className="space-y-3">
      {/* Main bar */}
      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Monthly allocation</span>
          <span className={`text-sm font-bold ${textColor}`}>
            {formatInrFull(totalAllocated)} / {formatInrFull(surplus)} surplus
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground">{percent}% allocated</span>
          {surplus - totalAllocated > 0 && (
            <span className="text-xs text-green-600">
              {formatInrFull(surplus - totalAllocated)} buffer remaining
            </span>
          )}
        </div>
      </div>

      {/* Conflict warnings */}
      {conflicts.length > 0 && (
        <div className="space-y-2">
          {conflicts.map((w, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border text-xs ${
                w.type === "over_budget"
                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
                  : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
              }`}
            >
              {w.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
