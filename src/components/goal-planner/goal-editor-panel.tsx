"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { Goal, GoalCategory } from "@/types";
import type { GoalTemplate } from "@/lib/financial-engine";
import {
  computeGoalDetail, getInflationRate, formatInrFull, formatInr,
} from "@/lib/financial-engine";

interface GoalEditorPanelProps {
  // Either editing an existing goal or creating from a template/suggestion
  existingGoal?: Goal;
  template?: GoalTemplate;
  suggestedCost?: number;
  suggestedYear?: number;
  monthlySurplus: number;
  currentYear: number;
  onSave: (goal: Goal) => void;
  onCancel: () => void;
}

export default function GoalEditorPanel({
  existingGoal,
  template,
  suggestedCost,
  suggestedYear,
  monthlySurplus,
  currentYear,
  onSave,
  onCancel,
}: GoalEditorPanelProps) {
  const isEditing = !!existingGoal;

  const [name, setName] = useState(
    existingGoal?.name ?? template?.name ?? ""
  );
  const [todayCost, setTodayCost] = useState(
    existingGoal?.todayCost ?? suggestedCost ?? template?.defaultCost ?? 500000
  );
  const [yearsFromNow, setYearsFromNow] = useState(
    existingGoal
      ? Math.max(1, existingGoal.targetYear - currentYear)
      : suggestedYear
        ? Math.max(1, suggestedYear - currentYear)
        : template?.defaultYearsFromNow ?? 3
  );
  const [existingCorpus, setExistingCorpus] = useState(
    existingGoal?.existingCorpus ?? 0
  );
  const [isRecurring, setIsRecurring] = useState(
    existingGoal?.isRecurring ?? template?.isRecurring ?? false
  );

  const category: GoalCategory = existingGoal?.category ?? template?.category ?? "custom";
  const inflationRate = existingGoal?.inflationRate ?? getInflationRate(category);

  // Live SIP preview
  const preview = useMemo(() => {
    const draftGoal: Goal = {
      id: existingGoal?.id ?? "draft",
      name,
      category,
      targetYear: currentYear + yearsFromNow,
      todayCost,
      inflationRate,
      isRecurring,
      status: "active",
      priority: existingGoal?.priority ?? 2,
      existingCorpus,
    };
    return computeGoalDetail(draftGoal, currentYear);
  }, [name, category, todayCost, inflationRate, yearsFromNow, existingCorpus, isRecurring, currentYear, existingGoal]);

  const sipPercent = monthlySurplus > 0
    ? Math.round((preview.requiredMonthlySip / monthlySurplus) * 100)
    : 0;
  const sipColor = sipPercent <= 20 ? "text-green-600" : sipPercent <= 40 ? "text-amber-600" : "text-red-600";
  const sipBgColor = sipPercent <= 20 ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900" : sipPercent <= 40 ? "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-900" : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900";

  const handleSave = () => {
    const goal: Goal = {
      id: existingGoal?.id ?? `${category}_${Date.now()}`,
      name: name || template?.name || "Custom Goal",
      category,
      targetYear: currentYear + yearsFromNow,
      todayCost,
      inflationRate,
      isRecurring,
      status: "active",
      priority: existingGoal?.priority ?? (category === "parents_medical" ? 1 : 2),
      existingCorpus,
    };
    onSave(goal);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-5">
        {/* Goal name */}
        <div className="space-y-1">
          <Label htmlFor="goalName">Goal name</Label>
          <Input
            id="goalName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Wedding, Dream Home, MBA"
          />
        </div>

        {/* Cost today */}
        <div className="space-y-1">
          <Label htmlFor="cost">How much does this cost today? (Rs)</Label>
          <Input
            id="cost"
            type="number"
            value={todayCost || ""}
            onChange={(e) => setTodayCost(parseInt(e.target.value) || 0)}
          />
          {template && (
            <p className="text-xs text-muted-foreground">
              {template.description}
            </p>
          )}
        </div>

        {/* Timeline slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>When do you need this?</Label>
            <span className="text-sm font-medium">
              In {yearsFromNow} {yearsFromNow === 1 ? "year" : "years"} ({currentYear + yearsFromNow})
            </span>
          </div>
          <Slider
            value={[yearsFromNow]}
            onValueChange={(v) => setYearsFromNow(Array.isArray(v) ? v[0] : v)}
            min={1}
            max={30}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 year</span>
            <span>30 years</span>
          </div>
        </div>

        {/* Existing corpus */}
        <div className="space-y-1">
          <Label htmlFor="corpus">Already saved for this? (Rs)</Label>
          <Input
            id="corpus"
            type="number"
            value={existingCorpus || ""}
            onChange={(e) => setExistingCorpus(parseInt(e.target.value) || 0)}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">
            Existing FDs, MFs, or savings earmarked for this goal
          </p>
        </div>

        {/* Recurring toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="rounded"
          />
          <div>
            <p className="text-sm font-medium">This repeats every year</p>
            <p className="text-xs text-muted-foreground">
              For annual expenses like vacations, insurance premiums
            </p>
          </div>
        </label>

        {/* Live SIP preview */}
        <div className={`p-4 rounded-lg border ${sipBgColor}`}>
          <p className="text-xs font-medium text-muted-foreground mb-2">What this goal costs you:</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Future cost</p>
              <p className="font-bold text-base">{formatInrFull(preview.futureCost)}</p>
              <p className="text-xs text-muted-foreground">
                at {(inflationRate * 100).toFixed(0)}% inflation
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Monthly SIP needed</p>
              <p className={`font-bold text-base ${sipColor}`}>
                {formatInrFull(preview.requiredMonthlySip)}
              </p>
              <p className="text-xs text-muted-foreground">
                {sipPercent}% of your surplus
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Invest in</p>
              <p className="font-medium text-xs">{preview.instrument}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Expected return</p>
              <p className="font-medium">{(preview.returnRate * 100).toFixed(0)}% p.a.</p>
            </div>
          </div>

          {existingCorpus > 0 && (
            <p className="text-xs mt-2 text-muted-foreground">
              Your existing Rs {formatInr(existingCorpus)} will grow to ~Rs {formatInr(preview.futureCost * (preview.progressPercent / 100))}, covering {preview.progressPercent}% of the target.
            </p>
          )}

          {sipPercent > 40 && (
            <p className="text-xs mt-2 text-red-600 font-medium">
              This goal alone takes {sipPercent}% of your surplus. Consider increasing the timeline or reducing the cost.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1" disabled={!name.trim() || todayCost <= 0}>
            {isEditing ? "Update goal" : "Add goal"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
