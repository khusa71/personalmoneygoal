"use client";

import { useState, useMemo, useRef, useEffect, forwardRef } from "react";
import {
  Heart, Home, Car, BookOpen, GraduationCap, Plane, Sunset,
  Activity, MapPin, ShoppingBag, Target, Plus, Pencil, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import type { AppState } from "@/lib/store";
import type { Goal, GoalCategory } from "@/types";
import {
  computeGoalDetail, formatInrFull, formatInr,
  calculateTax, getInflationRate, GOAL_TEMPLATES,
  calculateEmi,
  type GoalTemplate,
} from "@/lib/financial-engine";
import { buildFundingPlan, getFundingStrategy } from "@/lib/funding-plan";
import { generateSuggestions } from "@/lib/goal-suggestions";

// ─── Props ────────────────────────────────────────────────────
interface GoalPlannerProps {
  state: AppState;
  onAddGoal: (goal: Goal) => void;
  onUpdateGoal: (goal: Goal) => void;
  onRemoveGoal: (id: string) => void;
  onReorderGoals: (goals: Goal[]) => void;
}

type EditingState =
  | { mode: "idle" }
  | { mode: "add"; template?: GoalTemplate; suggestedCost?: number; suggestedYear?: number }
  | { mode: "edit"; goal: Goal };

// ─── Helpers ─────────────────────────────────────────────────
function displayInr(val: number): string {
  if (!val) return "";
  return val.toLocaleString("en-IN");
}
function parseInr(str: string): number {
  return parseInt(str.replace(/,/g, ""), 10) || 0;
}

// ─── Category identity ──────────────────────────────────────
type CategoryMeta = { label: string; Icon: React.FC<{ className?: string }>; color: string };

const CATEGORY_META: Record<GoalCategory, CategoryMeta> = {
  wedding:                  { label: "Wedding",        Icon: Heart,         color: "text-rose-500 bg-rose-50" },
  house:                    { label: "House",          Icon: Home,          color: "text-sky-600 bg-sky-50" },
  car:                      { label: "Car",            Icon: Car,           color: "text-violet-600 bg-violet-50" },
  education_school:         { label: "School",         Icon: BookOpen,      color: "text-amber-600 bg-amber-50" },
  education_college_india:  { label: "College",        Icon: GraduationCap, color: "text-amber-600 bg-amber-50" },
  education_college_abroad: { label: "College Abroad", Icon: Plane,         color: "text-indigo-600 bg-indigo-50" },
  retirement:               { label: "Retirement",     Icon: Sunset,        color: "text-orange-500 bg-orange-50" },
  parents_medical:          { label: "Medical",        Icon: Activity,      color: "text-red-500 bg-red-50" },
  vacation:                 { label: "Vacation",       Icon: MapPin,        color: "text-teal-600 bg-teal-50" },
  lifestyle_purchase:       { label: "Purchase",       Icon: ShoppingBag,   color: "text-purple-600 bg-purple-50" },
  custom:                   { label: "Custom",         Icon: Target,        color: "text-zinc-500 bg-zinc-100" },
};


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function GoalPlanner({
  state, onAddGoal, onUpdateGoal, onRemoveGoal, onReorderGoals,
}: GoalPlannerProps) {
  const [editing, setEditing] = useState<EditingState>({ mode: "idle" });
  const currentYear = new Date().getFullYear();
  const formRef = useRef<HTMLDivElement>(null);

  const monthlySurplus = useMemo(() => {
    const totalExpenses = state.profile.monthlyExpenses + state.lifestyleMonthly +
      (state.parentsAtHome ? 15000 : 0) +
      (state.parentsSeparateSupport ? (state.parentsMonthlySupportAmount || 20000) : 0) +
      (state.inLawsDependent ? 12000 : 0);
    const totalIncome = state.profile.annualIncome + state.profile.spouseIncome;
    const tax = calculateTax(state.profile.annualIncome, state.profile.taxRegime) +
      (state.profile.spouseIncome > 0 ? calculateTax(state.profile.spouseIncome, state.profile.taxRegime) : 0);
    return (totalIncome - tax) / 12 - totalExpenses - state.profile.existingEmis;
  }, [state]);

  const fundingPlan = useMemo(
    () => buildFundingPlan(
      state.goals, currentYear,
      state.liquidSavings || 0,
      state.longTermPortfolio || 0,
      state.redeemablePortfolioPercent || 0,
      state.profile.monthlyExpenses,
      state.profile.age,
    ),
    [state.goals, currentYear, state.liquidSavings, state.longTermPortfolio, state.redeemablePortfolioPercent, state.profile.monthlyExpenses, state.profile.age],
  );

  const totalMonthly = fundingPlan.reduce((s, f) => s + f.monthlyCommitment, 0);
  const leftover = Math.round(monthlySurplus - totalMonthly);

  const suggestions = useMemo(() => generateSuggestions(state), [state]);
  const unaddedSuggestions = suggestions.filter(s => !s.alreadyAdded);

  useEffect(() => {
    if (editing.mode !== "idle" && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editing]);

  return (
    <div className="max-w-2xl mx-auto pb-16">

      {/* ━━━ Header ━━━ */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Your goals</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Add what you're saving for. The dashboard figures out how to fund everything.
        </p>
      </div>

      {/* ━━━ Quick stats ━━━ */}
      {state.goals.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="py-3 px-4 bg-white border border-zinc-200 rounded-sm">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-1">Surplus</p>
            <p className="text-lg font-extrabold tabular-nums text-zinc-900">{formatInrFull(Math.round(monthlySurplus))}</p>
            <p className="text-[10px] text-zinc-400">per month</p>
          </div>
          <div className="py-3 px-4 bg-white border border-zinc-200 rounded-sm">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-1">Committed</p>
            <p className="text-lg font-extrabold tabular-nums text-zinc-900">{formatInrFull(Math.round(totalMonthly))}</p>
            <p className="text-[10px] text-zinc-400">{state.goals.length} goal{state.goals.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="py-3 px-4 bg-white border border-zinc-200 rounded-sm">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-1">Remaining</p>
            <p className={`text-lg font-extrabold tabular-nums ${leftover >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {leftover >= 0 ? formatInrFull(leftover) : `-${formatInrFull(Math.abs(leftover))}`}
            </p>
            <p className="text-[10px] text-zinc-400">{leftover >= 0 ? "for you" : "over-committed"}</p>
          </div>
        </div>
      )}

      {/* ━━━ Suggestions — first visit, no goals ━━━ */}
      {unaddedSuggestions.length > 0 && editing.mode === "idle" && state.goals.length === 0 && (
        <div className="mb-10">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-4">
            Suggested for you
          </p>
          <div className="grid grid-cols-2 gap-3">
            {unaddedSuggestions.slice(0, 6).map((s, i) => {
              const meta = CATEGORY_META[s.template.category];
              const { Icon } = meta;
              return (
                <button
                  key={i}
                  className={`text-left p-4 rounded-sm border transition-all hover:shadow-sm hover:-translate-y-0.5 ${
                    s.urgent ? "border-red-200 bg-red-50/30" : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                  onClick={() => setEditing({
                    mode: "add",
                    template: s.template,
                    suggestedCost: s.adjustedCost,
                    suggestedYear: s.suggestedTargetYear,
                  })}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${meta.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-semibold text-zinc-900">{s.template.name}</span>
                    {s.urgent && (
                      <span className="text-[8px] font-black uppercase tracking-wider text-red-600 ml-auto">Urgent</span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mb-2 line-clamp-2">{s.reason}</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold tabular-nums text-zinc-900">{formatInrFull(s.adjustedCost)}</span>
                    <span className="text-[11px] text-zinc-400">{s.suggestedTargetYear}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━━ Goal list ━━━ */}
      {state.goals.length > 0 && (
        <div className="mb-6">
          <div className="space-y-2">
            {state.goals.map((goal) => {
              const funding = fundingPlan.find(f => f.goal.id === goal.id);
              const detail = funding ? funding.detail : computeGoalDetail(goal, currentYear);
              const meta = CATEGORY_META[goal.category];
              const { Icon } = meta;
              const monthly = funding?.monthlyCommitment ?? 0;
              const isActive = editing.mode === "edit" && editing.goal.id === goal.id;

              return (
                <div
                  key={goal.id}
                  className={`bg-white border rounded-sm transition-colors ${
                    isActive ? "border-zinc-400" : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-4 px-4 py-3">
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Name + details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-900 truncate">{goal.name}</p>
                        {goal.isRecurring && (
                          <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-sm shrink-0">
                            Yearly
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 tabular-nums">
                        {formatInrFull(goal.todayCost)}{goal.isRecurring ? "/yr" : ""} · {goal.targetYear}
                        {goal.isRecurring && goal.endYear ? `--${goal.endYear}` : ""}
                        {!goal.isRecurring && detail.yearsToGoal > 0 && ` · ${detail.yearsToGoal}yr away`}
                        {goal.isRecurring && goal.endYear && ` · ${goal.endYear - goal.targetYear}yr`}
                      </p>
                    </div>

                    {/* Monthly */}
                    <div className="text-right shrink-0">
                      {monthly > 0 ? (
                        <p className="text-sm font-bold tabular-nums text-zinc-900">{formatInrFull(monthly)}/mo</p>
                      ) : (
                        <p className="text-[11px] font-bold text-emerald-600">Covered</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (isActive) setEditing({ mode: "idle" });
                          else setEditing({ mode: "edit", goal });
                        }}
                        className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-700"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveGoal(goal.id)}
                        className="h-7 w-7 p-0 text-zinc-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Loan EMI line for house goals */}
                  {funding?.loanEmi && funding.loanLabel && (
                    <div className="px-4 py-2 border-t border-zinc-100 bg-sky-50/50">
                      <p className="text-[10px] text-sky-700">{funding.loanLabel}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━━ Add triggers ━━━ */}
      {editing.mode === "idle" && (
        <div className="mb-10 space-y-4">
          <Button
            variant="outline"
            onClick={() => setEditing({ mode: "add" })}
            className="w-full h-11 border-dashed text-zinc-500 hover:text-zinc-900 rounded-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add a goal
          </Button>

          {/* Suggestions for existing users */}
          {state.goals.length > 0 && unaddedSuggestions.length > 0 && (
            <div>
              <p className="text-[10px] text-zinc-400 mb-2">Suggested</p>
              <div className="flex flex-wrap gap-2">
                {unaddedSuggestions.slice(0, 4).map((s, i) => {
                  const { Icon } = CATEGORY_META[s.template.category];
                  return (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing({
                        mode: "add",
                        template: s.template,
                        suggestedCost: s.adjustedCost,
                        suggestedYear: s.suggestedTargetYear,
                      })}
                      className={`rounded-sm ${s.urgent ? "border-red-200 text-red-700 hover:bg-red-50" : ""}`}
                    >
                      <Icon className="w-3.5 h-3.5 mr-1" />
                      {s.template.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Template gallery */}
          <div>
            {state.goals.length > 0 && (
              <p className="text-[10px] text-zinc-400 mb-2">From templates</p>
            )}
            <div className="flex flex-wrap gap-2">
              {GOAL_TEMPLATES.map((t, i) => {
                const exists = state.goals.some(g => g.category === t.category && g.name === t.name);
                if (exists) return null;
                const isSuggested = unaddedSuggestions.some(s => s.template.category === t.category);
                if (isSuggested && state.goals.length > 0) return null;
                const { Icon } = CATEGORY_META[t.category];
                return (
                  <Button
                    key={i}
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing({ mode: "add", template: t })}
                    className="border border-dashed border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 rounded-sm"
                  >
                    <Icon className="w-3.5 h-3.5 mr-1" />
                    {t.name}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ━━━ Editor ━━━ */}
      {editing.mode !== "idle" && (
        <GoalForm
          ref={formRef}
          existingGoal={editing.mode === "edit" ? editing.goal : undefined}
          template={editing.mode === "add" ? editing.template : undefined}
          suggestedCost={editing.mode === "add" ? editing.suggestedCost : undefined}
          suggestedYear={editing.mode === "add" ? editing.suggestedYear : undefined}
          monthlySurplus={monthlySurplus}
          currentYear={currentYear}
          onSave={(goals) => {
            for (const goal of goals) {
              if (editing.mode === "edit" && goal.id === editing.goal.id) {
                onUpdateGoal(goal);
              } else {
                onAddGoal(goal);
              }
            }
            setEditing({ mode: "idle" });
          }}
          onCancel={() => setEditing({ mode: "idle" })}
        />
      )}

      {/* ━━━ Empty state ━━━ */}
      {state.goals.length === 0 && editing.mode === "idle" && unaddedSuggestions.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-zinc-200 rounded-sm">
          <Target className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-500 mb-1">No goals yet</p>
          <p className="text-xs text-zinc-400 mb-6">What are you saving for?</p>
          <Button onClick={() => setEditing({ mode: "add" })} className="rounded-sm">
            <Plus className="w-4 h-4 mr-2" />
            Add your first goal
          </Button>
        </div>
      )}
    </div>
  );
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GOAL FORM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GoalFormProps {
  existingGoal?: Goal;
  template?: GoalTemplate;
  suggestedCost?: number;
  suggestedYear?: number;
  monthlySurplus: number;
  currentYear: number;
  onSave: (goals: Goal[]) => void;
  onCancel: () => void;
}

const GoalForm = forwardRef<HTMLDivElement, GoalFormProps>(function GoalForm(
  { existingGoal, template, suggestedCost, suggestedYear, monthlySurplus, currentYear, onSave, onCancel },
  ref,
) {
  const isEditing = !!existingGoal;
  const [name, setName] = useState(existingGoal?.name ?? template?.name ?? "");
  const [todayCost, setTodayCost] = useState(() => {
    if (existingGoal) {
      // For house goals, stored todayCost is down payment (20%). Show property value.
      return existingGoal.category === "house"
        ? Math.round(existingGoal.todayCost / 0.20)
        : existingGoal.todayCost;
    }
    return suggestedCost ?? template?.defaultCost ?? 500000;
  });
  const [yearsFromNow, setYearsFromNow] = useState(
    existingGoal
      ? Math.max(1, existingGoal.targetYear - currentYear)
      : suggestedYear
        ? Math.max(1, suggestedYear - currentYear)
        : template?.defaultYearsFromNow ?? 3
  );
  const [isRecurring, setIsRecurring] = useState(
    existingGoal?.isRecurring ?? template?.isRecurring ?? false
  );
  // Recurring: how many years does this expense run?
  const defaultDuration = existingGoal?.endYear && existingGoal?.targetYear
    ? existingGoal.endYear - existingGoal.targetYear
    : template?.category?.startsWith("education") ? 15 : 10;
  const [recurringDuration, setRecurringDuration] = useState(defaultDuration);
  // House loan: whether to also create a loan EMI goal
  const [addLoanGoal, setAddLoanGoal] = useState(true);
  const [loanTenure, setLoanTenure] = useState(20);
  const [loanRate, setLoanRate] = useState(8.5);

  const category: GoalCategory = existingGoal?.category ?? template?.category ?? "custom";
  const inflationRate = getInflationRate(category);
  const isHouse = category === "house";

  // For house goals, user enters property value but we save down payment (20%) as todayCost
  const effectiveCost = isHouse ? Math.round(todayCost * 0.20) : todayCost;

  const preview = useMemo(
    () => computeGoalDetail(
      {
        id: existingGoal?.id ?? "draft",
        name,
        category,
        targetYear: currentYear + yearsFromNow,
        todayCost: effectiveCost,
        inflationRate,
        isRecurring,
        status: "active",
        priority: existingGoal?.priority ?? 2,
        existingCorpus: 0,
      },
      currentYear,
    ),
    [name, category, effectiveCost, inflationRate, yearsFromNow, currentYear, existingGoal, isRecurring],
  );

  // Strategy determines how the goal is funded
  const strategy = getFundingStrategy(
    { todayCost, isRecurring, category } as Goal,
    yearsFromNow,
  );
  const isIncomeOnly = strategy === "income_only";

  // For income-only: monthly set-aside
  const incomeMonthly = isRecurring
    ? Math.round(todayCost / 12)
    : Math.round(todayCost / Math.max(1, yearsFromNow * 12));

  const displayMonthly = isIncomeOnly ? incomeMonthly : preview.requiredMonthlySip;

  const sipPercent = monthlySurplus > 0
    ? Math.round((displayMonthly / monthlySurplus) * 100)
    : 0;

  // Loan calculation for house goals
  // User enters property value. Down payment = 20%, loan = 80%.
  const loanPreview = useMemo(() => {
    if (!isHouse) return null;
    // preview.futureCost = inflation-adjusted down payment (20% of property)
    const downPaymentFuture = preview.futureCost;
    const propertyFuture = Math.round(downPaymentFuture / 0.20);
    const loanAmount = Math.round(propertyFuture * 0.80);
    const emi = Math.round(calculateEmi(loanAmount, loanRate / 100, loanTenure));
    const annualEmi = emi * 12;
    return { propertyValue: propertyFuture, downPaymentFuture, loanAmount, emi, annualEmi, tenure: loanTenure, rate: loanRate };
  }, [isHouse, preview.futureCost, loanRate, loanTenure]);

  const meta = CATEGORY_META[category];
  const { Icon } = meta;

  const handleSave = () => {
    const goals: Goal[] = [];

    // Primary goal — for house, save down payment (20%) not full property value
    const primaryGoal: Goal = {
      id: existingGoal?.id ?? `${category}_${Date.now()}`,
      name: name || template?.name || "Custom Goal",
      category,
      targetYear: currentYear + yearsFromNow,
      todayCost: effectiveCost,
      inflationRate,
      isRecurring,
      status: "active",
      priority: existingGoal?.priority ?? (category === "parents_medical" ? 1 : 2),
      existingCorpus: 0,
    };
    // Set endYear for recurring goals
    if (isRecurring && !isHouse) {
      primaryGoal.endYear = currentYear + yearsFromNow + recurringDuration;
    }
    goals.push(primaryGoal);

    // Companion loan EMI goal for house
    if (isHouse && addLoanGoal && loanPreview && !isEditing) {
      goals.push({
        id: `house_loan_${Date.now()}`,
        name: `Home Loan EMI`,
        category: "custom",
        targetYear: currentYear + yearsFromNow, // starts when you buy
        todayCost: loanPreview.annualEmi,
        inflationRate: 0, // EMI is fixed
        isRecurring: true,
        status: "active",
        priority: 1,
        existingCorpus: 0,
        endYear: currentYear + yearsFromNow + loanTenure,
      });
    }

    onSave(goals);
  };

  return (
    <div ref={ref} className="my-6">
      <Card className="overflow-hidden gap-0 py-0 ring-0 shadow-sm border-zinc-300 rounded-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 bg-zinc-50/60">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center ${meta.color}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-semibold text-zinc-900">
              {isEditing ? `Edit: ${name || "goal"}` : template ? template.name : "New goal"}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-zinc-400 hover:text-zinc-700 h-7">
            Cancel
          </Button>
        </div>

        <div className="p-5 space-y-5">
          {/* Goal name */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-zinc-500">What are you saving for?</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Goa trip, New phone, Home down payment"
              className="h-10 text-sm bg-white border-zinc-200 rounded-sm"
              autoFocus
            />
            {template?.description && (
              <p className="text-[10px] text-zinc-400">{template.description}</p>
            )}
          </div>

          {/* Cost + Timeline */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-zinc-500">
                {isHouse ? "Property value" : isRecurring ? "Annual cost" : "Cost today"}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400">Rs</span>
                <Input
                  value={displayInr(todayCost)}
                  onChange={(e) => setTodayCost(parseInr(e.target.value))}
                  className="h-10 pl-8 text-sm tabular-nums bg-white border-zinc-200 rounded-sm"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label className="text-[11px] font-medium text-zinc-500">
                  {isRecurring ? "Starting" : isHouse ? "Buy in" : "When?"}
                </Label>
                <span className="text-sm font-bold text-zinc-900 tabular-nums">
                  {currentYear + yearsFromNow}
                </span>
              </div>
              <Slider
                value={[yearsFromNow]}
                onValueChange={(v) => setYearsFromNow(Array.isArray(v) ? v[0] : v)}
                min={1}
                max={30}
                step={1}
                className="mt-3"
              />
              <div className="flex justify-between text-[10px] text-zinc-300 tabular-nums">
                <span>1yr</span><span>10</span><span>20</span><span>30yr</span>
              </div>
            </div>
          </div>

          {/* Recurring toggle — not shown for house (loan handles that) */}
          {!isHouse && (
            <div className="flex items-center justify-between py-2.5 px-3 bg-zinc-50 border border-zinc-100 rounded-sm">
              <div>
                <p className="text-[11px] font-medium text-zinc-700">Recurring expense</p>
                <p className="text-[9px] text-zinc-400">Vacation, school fees, insurance premium, phone upgrade, etc.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRecurring(!isRecurring)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
                  isRecurring ? "bg-zinc-900" : "bg-zinc-200"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    isRecurring ? "translate-x-[18px]" : "translate-x-[2px]"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Recurring duration — how many years does it run? */}
          {isRecurring && !isHouse && (
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label className="text-[11px] font-medium text-zinc-500">Runs for</Label>
                <span className="text-sm font-bold text-zinc-900 tabular-nums">
                  {recurringDuration} years ({currentYear + yearsFromNow} -- {currentYear + yearsFromNow + recurringDuration})
                </span>
              </div>
              <Slider
                value={[recurringDuration]}
                onValueChange={(v) => setRecurringDuration(Array.isArray(v) ? v[0] : v)}
                min={1}
                max={40}
                step={1}
              />
              <div className="flex justify-between text-[10px] text-zinc-300 tabular-nums">
                <span>1yr</span><span>10</span><span>20</span><span>40yr</span>
              </div>
              <p className="text-[9px] text-zinc-400">
                {category.startsWith("education")
                  ? "School fees typically run 15-18 years (age 4 to 22)"
                  : "How long will you keep paying this? Set to your retirement year if indefinite."}
              </p>
            </div>
          )}

          {/* Preview — funding summary */}
          <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-sm space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-[10px] text-zinc-400 mb-0.5">
                  {isIncomeOnly
                    ? "Monthly set-aside"
                    : isHouse
                      ? "Down payment SIP (20%)"
                      : "Monthly SIP needed"}
                </p>
                <p className={`text-lg font-extrabold tabular-nums ${
                  sipPercent > 40 ? "text-red-600" : sipPercent > 20 ? "text-amber-600" : "text-zinc-900"
                }`}>
                  {formatInrFull(displayMonthly)}/mo
                </p>
                {isIncomeOnly && (
                  <p className="text-[9px] text-zinc-400">
                    {isRecurring ? "From your monthly budget" : `Set aside over ${yearsFromNow}yr`}
                  </p>
                )}
              </div>
              {!isIncomeOnly && (
                <div className="text-right">
                  <p className="text-[10px] text-zinc-400 mb-0.5">
                    {isHouse ? "Down payment in " + (currentYear + yearsFromNow) : "Future cost"}
                  </p>
                  <p className="text-sm font-bold tabular-nums text-zinc-700">
                    {formatInrFull(preview.futureCost)}
                  </p>
                  <p className="text-[9px] text-zinc-400">
                    {(inflationRate * 100).toFixed(0)}% inflation · {preview.instrument}
                  </p>
                </div>
              )}
            </div>

            {sipPercent > 40 && (
              <p className="text-[10px] text-red-600">
                Takes {sipPercent}% of your surplus. Try extending the timeline.
              </p>
            )}

            {isRecurring && !isIncomeOnly && (
              <p className="text-[10px] text-zinc-500">
                Repeats every year. Budget {formatInrFull(incomeMonthly)}/mo from income.
              </p>
            )}
          </div>

          {/* Loan section for house */}
          {isHouse && loanPreview && (
            <div className="p-4 bg-sky-50 border border-sky-100 rounded-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-sky-800">Home loan (separate goal)</p>
                  <p className="text-[9px] text-sky-600">EMI starts after purchase in {currentYear + yearsFromNow}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddLoanGoal(!addLoanGoal)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
                    addLoanGoal ? "bg-sky-600" : "bg-zinc-200"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                      addLoanGoal ? "translate-x-[18px]" : "translate-x-[2px]"
                    }`}
                  />
                </button>
              </div>

              {addLoanGoal && (
                <>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <p className="text-[9px] text-sky-500 mb-0.5">Property</p>
                      <p className="text-sm font-bold tabular-nums text-sky-900">{formatInr(loanPreview.propertyValue)}</p>
                      <p className="text-[8px] text-sky-400">in {currentYear + yearsFromNow}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-sky-500 mb-0.5">Down (20%)</p>
                      <p className="text-sm font-bold tabular-nums text-sky-900">{formatInr(loanPreview.downPaymentFuture)}</p>
                      <p className="text-[8px] text-sky-400">your SIP target</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-sky-500 mb-0.5">Loan (80%)</p>
                      <p className="text-sm font-bold tabular-nums text-sky-900">{formatInr(loanPreview.loanAmount)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-sky-500 mb-0.5">EMI</p>
                      <p className="text-sm font-bold tabular-nums text-sky-900">{formatInrFull(loanPreview.emi)}/mo</p>
                      <p className="text-[8px] text-sky-400">for {loanPreview.tenure}yr</p>
                    </div>
                  </div>

                  {/* Loan tenure + rate */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-baseline justify-between mb-1">
                        <Label className="text-[10px] font-medium text-sky-600">Tenure</Label>
                        <span className="text-[11px] font-bold text-sky-900 tabular-nums">{loanTenure} years</span>
                      </div>
                      <Slider
                        value={[loanTenure]}
                        onValueChange={(v) => setLoanTenure(Array.isArray(v) ? v[0] : v)}
                        min={5}
                        max={30}
                        step={1}
                      />
                      <div className="flex justify-between text-[9px] text-sky-300 mt-1">
                        <span>5yr</span><span>15</span><span>30yr</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-baseline justify-between mb-1">
                        <Label className="text-[10px] font-medium text-sky-600">Interest rate</Label>
                        <span className="text-[11px] font-bold text-sky-900 tabular-nums">{loanRate}%</span>
                      </div>
                      <Slider
                        value={[loanRate * 10]}
                        onValueChange={(v) => setLoanRate((Array.isArray(v) ? v[0] : v) / 10)}
                        min={60}
                        max={120}
                        step={5}
                      />
                      <div className="flex justify-between text-[9px] text-sky-300 mt-1">
                        <span>6%</span><span>9%</span><span>12%</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[9px] text-sky-600">
                    This adds a "Home Loan EMI" goal at {formatInrFull(loanPreview.emi)}/mo as a recurring expense.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Save */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1 h-10 text-sm border-zinc-200 rounded-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || todayCost <= 0}
              className="flex-1 h-10 text-sm rounded-sm"
            >
              {isEditing ? "Update" : isHouse && addLoanGoal ? "Add 2 goals" : "Add goal"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
});
