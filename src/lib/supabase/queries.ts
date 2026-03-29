import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppState } from "@/lib/store";
import type { Goal } from "@/types";
import { DEFAULT_STATE } from "@/lib/store";

// ── Profile: DB row ↔ AppState mapping ─────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

function profileRowToState(row: any): Omit<AppState, "goals"> {
  return {
    profile: {
      name: row.name ?? "",
      age: row.age ?? 28,
      annualIncome: Number(row.annual_income ?? 3000000),
      monthlyExpenses: Number(row.monthly_expenses ?? 40000),
      existingEmis: Number(row.existing_emis ?? 0),
      cityTier: row.city_tier ?? "metro",
      taxRegime: row.tax_regime ?? "new",
      spouseIncome: Number(row.spouse_income ?? 0),
    },
    liquidSavings: Number(row.liquid_savings ?? 0),
    longTermPortfolio: Number(row.long_term_portfolio ?? 0),
    redeemablePortfolioPercent: row.redeemable_portfolio_percent ?? 0,
    retirementAge: row.retirement_age ?? 55,
    onboarded: row.onboarded ?? false,
    parentsAtHome: row.parents_at_home ?? false,
    parentsSeparateSupport: row.parents_separate_support ?? false,
    parentsMonthlySupportAmount: Number(row.parents_monthly_support ?? 0),
    inLawsDependent: row.in_laws_dependent ?? false,
    maritalStatus: row.marital_status ?? "single",
    marriageAge: row.marriage_age ?? null,
    numberOfKids: row.number_of_kids ?? 0,
    kidsAges: row.kids_ages ?? [],
    planningMoreKids: row.planning_more_kids ?? false,
    nextKidInYears: row.next_kid_in_years ?? 0,
    firstKidAge: row.first_kid_age ?? null,
    secondKidAge: row.second_kid_age ?? null,
    parentsHealthInsurance: row.parents_health_insurance ?? false,
    parentsHealthPremium: Number(row.parents_health_premium ?? 0),
    existingInvestmentMonthly: Number(row.existing_investment_monthly ?? 0),
    lifestyleMonthly: Number(row.lifestyle_monthly ?? 10000),
  };
}

function stateToProfileRow(state: AppState) {
  return {
    name: state.profile.name,
    age: state.profile.age,
    annual_income: state.profile.annualIncome,
    monthly_expenses: state.profile.monthlyExpenses,
    existing_emis: state.profile.existingEmis,
    city_tier: state.profile.cityTier,
    tax_regime: state.profile.taxRegime,
    spouse_income: state.profile.spouseIncome,
    liquid_savings: state.liquidSavings,
    long_term_portfolio: state.longTermPortfolio,
    redeemable_portfolio_percent: state.redeemablePortfolioPercent,
    retirement_age: state.retirementAge,
    onboarded: state.onboarded,
    parents_at_home: state.parentsAtHome,
    parents_separate_support: state.parentsSeparateSupport,
    parents_monthly_support: state.parentsMonthlySupportAmount,
    in_laws_dependent: state.inLawsDependent,
    marital_status: state.maritalStatus,
    marriage_age: state.marriageAge,
    number_of_kids: state.numberOfKids,
    kids_ages: state.kidsAges,
    planning_more_kids: state.planningMoreKids,
    next_kid_in_years: state.nextKidInYears,
    first_kid_age: state.firstKidAge,
    second_kid_age: state.secondKidAge,
    parents_health_insurance: state.parentsHealthInsurance,
    parents_health_premium: state.parentsHealthPremium,
    existing_investment_monthly: state.existingInvestmentMonthly,
    lifestyle_monthly: state.lifestyleMonthly,
  };
}

// ── Goal: DB row ↔ Goal mapping ────────────────────────────────────

function goalRowToGoal(row: any): Goal {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    targetYear: row.target_year,
    todayCost: Number(row.today_cost),
    inflationRate: Number(row.inflation_rate),
    isRecurring: row.is_recurring,
    status: row.status,
    priority: row.priority,
    existingCorpus: Number(row.existing_corpus),
    endYear: row.end_year ?? undefined,
  };
}

function goalToRow(goal: Goal, userId: string) {
  return {
    id: goal.id,
    user_id: userId,
    name: goal.name,
    category: goal.category,
    target_year: goal.targetYear,
    today_cost: goal.todayCost,
    inflation_rate: goal.inflationRate,
    is_recurring: goal.isRecurring,
    status: goal.status,
    priority: goal.priority,
    existing_corpus: goal.existingCorpus,
    end_year: goal.endYear ?? null,
  };
}

// ── CRUD ────────────────────────────────────────────────────────────

export async function fetchAppState(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppState> {
  const [profileRes, goalsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("goals").select("*").eq("user_id", userId).order("priority"),
  ]);

  const profileData = profileRes.data
    ? profileRowToState(profileRes.data)
    : { ...DEFAULT_STATE };

  const goals: Goal[] = (goalsRes.data ?? []).map(goalRowToGoal);

  return { ...profileData, goals };
}

export async function upsertProfile(
  supabase: SupabaseClient,
  userId: string,
  state: AppState,
): Promise<void> {
  await supabase
    .from("profiles")
    .update(stateToProfileRow(state))
    .eq("id", userId);
}

export async function upsertGoal(
  supabase: SupabaseClient,
  userId: string,
  goal: Goal,
): Promise<void> {
  await supabase
    .from("goals")
    .upsert(goalToRow(goal, userId), { onConflict: "id,user_id" });
}

export async function deleteGoal(
  supabase: SupabaseClient,
  userId: string,
  goalId: string,
): Promise<void> {
  await supabase
    .from("goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", userId);
}

export async function replaceAllGoals(
  supabase: SupabaseClient,
  userId: string,
  goals: Goal[],
): Promise<void> {
  // Delete all then insert — simplest for reorder + bulk operations
  await supabase.from("goals").delete().eq("user_id", userId);
  if (goals.length > 0) {
    await supabase
      .from("goals")
      .insert(goals.map((g) => goalToRow(g, userId)));
  }
}
