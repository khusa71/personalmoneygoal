export type GoalCategory =
  | "wedding"
  | "house"
  | "car"
  | "education_school"
  | "education_college_india"
  | "education_college_abroad"
  | "retirement"
  | "parents_medical"
  | "vacation"
  | "lifestyle_purchase"
  | "custom"
  | "loan";

export type GoalStatus = "active" | "completed" | "deferred";

export type RiskLevel = "low" | "medium" | "high";
export type TimeHorizon = "short" | "medium" | "long"; // ≤1yr, 1-5yr, 5yr+

export type LifeStage = "single" | "married_no_kids" | "family_young_kids" | "family_school_kids" | "family_two_kids" | "empty_nest";

export interface UserProfile {
  name: string;
  age: number;
  annualIncome: number; // gross, in ₹
  monthlyExpenses: number;
  existingEmis: number;
  cityTier: "metro" | "tier1" | "tier2";
  salaryGrowthOverride?: number; // flat override, else use phase-based
  taxRegime: "old" | "new";
  spouseIncome: number;
}

export interface Goal {
  id: string;
  name: string;
  category: GoalCategory;
  targetYear: number;
  todayCost: number;
  inflationRate: number; // category-specific, auto-filled
  isRecurring: boolean;
  status: GoalStatus;
  priority: number; // tier 0-4
  existingCorpus: number; // already saved toward this goal
  endYear?: number; // for recurring goals: when the expense stops (e.g., kid turns 22)
  // Loan-specific fields (only when category === "loan")
  loanPrincipal?: number;      // original principal amount
  loanInterestRate?: number;   // annual rate, decimal (e.g. 0.085 for 8.5%)
  loanTenureYears?: number;    // loan tenure in years
}

export interface Allocation {
  goalId: string;
  goalName: string;
  monthlyAmount: number;   // actually allocated (may be less than needed)
  neededAmount: number;     // ideally needed (corpus-adjusted via goalSipOverrides)
  instrument: string;
  returnRate: number;
}

export interface FeasibilityResult {
  feasible: boolean;
  monthlySurplus: number;
  totalRequiredSip: number;   // actually allocated (for cash flow display)
  totalIdealSip: number;      // uncapped sum of all goal + retirement SIP needs (for feasibility)
  monthlyGap: number;
  allocations: Allocation[];
  emergencyFundStatus: {
    target: number;
    current: number;
    monthlyContribution: number;
    monthsToFull: number;
  };
  retirementDetails: {
    corpusNeeded: number;
    monthlySip: number;
    projectedCorpus: number;
  };
  suggestions: string[];
}

export interface GoalDetail extends Goal {
  futureCost: number;
  requiredMonthlySip: number;
  instrument: string;
  returnRate: number;
  yearsToGoal: number;
  progressPercent: number;
  riskLevel: RiskLevel;
  horizon: TimeHorizon;
}

export interface ScenarioOverrides {
  salaryGrowth?: number;
  spouseIncome?: number;
  numberOfKids?: number;
  retirementAge?: number;
  cityTier?: "metro" | "tier1" | "tier2";
  monthlyExpenses?: number;
}

export interface ScenarioResult {
  name: string;
  overrides: ScenarioOverrides;
  feasibility: FeasibilityResult;
}
