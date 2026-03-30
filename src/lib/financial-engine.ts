import type { UserProfile, Goal, GoalCategory, Allocation, FeasibilityResult, GoalDetail, RiskLevel, TimeHorizon } from "@/types";

// ============================================================
// INFLATION RATES (Annual, by category)
// Source: FINANCIAL_MODEL.md Section 1.1
// ============================================================
const INFLATION_RATES: Record<GoalCategory, number> = {
  wedding: 0.08,
  house: 0.07,
  car: 0.05,
  education_school: 0.10,
  education_college_india: 0.10,
  education_college_abroad: 0.08,
  retirement: 0.07, // lifestyle inflation for expense projection
  parents_medical: 0.14,
  vacation: 0.07,
  lifestyle_purchase: 0.06,
  custom: 0.07,
};

// ============================================================
// INSTRUMENT RETURNS (Annual, nominal)
// Source: FINANCIAL_MODEL.md Section 1.2
// ============================================================
export interface InstrumentInfo {
  name: string;
  annualReturn: number;
  riskLevel: RiskLevel;
  horizon: TimeHorizon;
}

export function selectInstrument(yearsToGoal: number, category: GoalCategory): InstrumentInfo {
  // Special cases first
  if (category === "retirement") {
    return { name: "NPS (Equity) + Index Fund", annualReturn: 0.11, riskLevel: "high", horizon: "long" };
  }

  if (yearsToGoal <= 1) {
    return { name: "Liquid Fund / Savings", annualReturn: 0.05, riskLevel: "low", horizon: "short" };
  }
  if (yearsToGoal <= 3) {
    return { name: "Short Duration Debt Fund", annualReturn: 0.07, riskLevel: "low", horizon: "short" };
  }
  if (yearsToGoal <= 5) {
    return { name: "Balanced Advantage Fund", annualReturn: 0.09, riskLevel: "medium", horizon: "medium" };
  }
  if (yearsToGoal <= 7) {
    return { name: "Large Cap Equity Fund", annualReturn: 0.11, riskLevel: "medium", horizon: "long" };
  }
  if (yearsToGoal <= 10) {
    return { name: "Flexi Cap / Nifty 50 Index Fund", annualReturn: 0.12, riskLevel: "high", horizon: "long" };
  }
  return { name: "Mid/Small Cap Equity Fund", annualReturn: 0.14, riskLevel: "high", horizon: "long" };
}

// ============================================================
// SALARY GROWTH (Phase-based)
// Source: FINANCIAL_MODEL.md Section 1.3
// ============================================================
export function getSalaryGrowthRate(age: number): number {
  if (age < 30) return 0.12;
  if (age < 38) return 0.08;
  if (age < 48) return 0.06;
  return 0.03;
}

export function projectAnnualIncome(currentIncome: number, currentAge: number, targetAge: number, flatOverride?: number): number {
  let income = currentIncome;
  for (let age = currentAge; age < targetAge; age++) {
    const growth = flatOverride ?? getSalaryGrowthRate(age);
    income *= (1 + growth);
  }
  return income;
}

// ============================================================
// TAX CALCULATION
// Source: FINANCIAL_MODEL.md Section 1.4
// ============================================================
export function calculateTax(annualIncome: number, regime: "old" | "new" = "new"): number {
  if (regime === "new") {
    const taxable = Math.max(0, annualIncome - 75000); // standard deduction FY2025-26
    let tax = 0;
    // FY2025-26 new regime slabs
    const slabs = [
      { limit: 400000, rate: 0 },      // 0–4L at 0%
      { limit: 400000, rate: 0.05 },   // 4–8L at 5%
      { limit: 400000, rate: 0.10 },   // 8–12L at 10%
      { limit: 400000, rate: 0.15 },   // 12–16L at 15%
      { limit: 400000, rate: 0.20 },   // 16–20L at 20%
      { limit: 400000, rate: 0.25 },   // 20–24L at 25%
      { limit: Infinity, rate: 0.30 }, // 24L+ at 30%
    ];
    let remaining = taxable;
    for (const slab of slabs) {
      const taxableInSlab = Math.min(remaining, slab.limit);
      tax += taxableInSlab * slab.rate;
      remaining -= taxableInSlab;
      if (remaining <= 0) break;
    }
    // FY2025-26 Section 87A rebate: taxable income ≤ 12L → zero tax
    if (taxable <= 1200000) tax = 0;
    return Math.round(tax * 1.04); // 4% cess
  }

  // Old regime (simplified — no 80C etc. modeled here)
  const taxable = Math.max(0, annualIncome - 50000); // standard deduction old regime
  let tax = 0;
  const slabs = [
    { limit: 250000, rate: 0 },
    { limit: 250000, rate: 0.05 },
    { limit: 500000, rate: 0.20 },
    { limit: Infinity, rate: 0.30 },
  ];
  let remaining = taxable;
  for (const slab of slabs) {
    const taxableInSlab = Math.min(remaining, slab.limit);
    tax += taxableInSlab * slab.rate;
    remaining -= taxableInSlab;
    if (remaining <= 0) break;
  }
  if (taxable <= 500000) tax = 0; // 87A rebate old regime
  return Math.round(tax * 1.04);
}

// ============================================================
// CORE FORMULAS
// Source: FINANCIAL_MODEL.md Section 8
// ============================================================

/** Future value of a lump sum: FV = PV × (1 + r)^n */
export function futureValue(presentValue: number, annualRate: number, years: number): number {
  return presentValue * Math.pow(1 + annualRate, years);
}

/** Monthly SIP needed to reach a future value: P = FV / [((1+r)^n - 1)/r × (1+r)] */
export function requiredMonthlySip(targetFV: number, annualReturn: number, years: number): number {
  if (years <= 0) return targetFV; // need it now
  const months = years * 12;
  const r = Math.pow(1 + annualReturn, 1 / 12) - 1; // monthly rate
  if (r === 0) return targetFV / months;
  const fvAnnuityFactor = ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
  return targetFV / fvAnnuityFactor;
}

/** Future value of monthly SIP */
export function sipFutureValue(monthlySip: number, annualReturn: number, years: number): number {
  const months = years * 12;
  const r = Math.pow(1 + annualReturn, 1 / 12) - 1;
  if (r === 0) return monthlySip * months;
  return monthlySip * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
}

/** EMI calculation */
export function calculateEmi(principal: number, annualRate: number, years: number): number {
  const months = years * 12;
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  return principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
}

/** Real rate of return */
export function realReturn(nominal: number, inflation: number): number {
  return ((1 + nominal) / (1 + inflation)) - 1;
}

/**
 * Step-up SIP: starting SIP increases by stepUpRate each year.
 * Year 0: P/mo, Year 1: P×(1+g)/mo, Year 2: P×(1+g)²/mo, etc.
 * Returns the future value of all contributions grown to the end.
 */
export function stepUpSipFutureValue(
  startingMonthlySip: number,
  annualReturn: number,
  years: number,
  annualStepUp: number,
): number {
  if (years <= 0 || startingMonthlySip <= 0) return 0;
  const r = Math.pow(1 + annualReturn, 1 / 12) - 1;
  const totalMonths = Math.round(years * 12);
  let total = 0;
  for (let m = 0; m < totalMonths; m++) {
    const sip = startingMonthlySip * Math.pow(1 + annualStepUp, Math.floor(m / 12));
    total += sip * Math.pow(1 + r, totalMonths - m); // beginning-of-month
  }
  return total;
}

/**
 * Required STARTING monthly SIP (with annual step-up) to reach a target FV.
 * Much lower than flat SIP because contributions increase each year.
 * E.g., 10% step-up for 15yr in equity: starting SIP is ~55% of flat SIP.
 */
export function requiredStartingSip(
  targetFV: number,
  annualReturn: number,
  years: number,
  annualStepUp: number,
): number {
  if (years <= 0) return targetFV;
  if (annualStepUp <= 0) return requiredMonthlySip(targetFV, annualReturn, years);
  const factor = stepUpSipFutureValue(1, annualReturn, years, annualStepUp);
  if (factor <= 0) return targetFV;
  return targetFV / factor;
}

// ============================================================
// RETIREMENT CORPUS
// Source: FINANCIAL_MODEL.md Section 2.5
// ============================================================
export function retirementCorpus(
  currentMonthlyExpense: number,
  currentAge: number,
  retireAge: number,
  yearsInRetirement: number = 30,
  expenseInflation: number = 0.07,
): number {
  const annualExpenseAtRetirement = currentMonthlyExpense * 12 * Math.pow(1 + expenseInflation, retireAge - currentAge);
  // Using 3.5% safe withdrawal rate for India
  return annualExpenseAtRetirement / 0.035;
}

/**
 * Opportunity cost of redeeming `amount` from a long-term equity portfolio
 * (assumed `portfolioReturn`) vs investing it at the goal's `goalReturn` over `years`.
 * Returns the additional wealth foregone — i.e., what you give up by pulling money
 * out of compounding equity early.
 */
export function computeCompoundingLoss(
  amount: number,
  years: number,
  goalReturn: number,
  portfolioReturn: number = 0.12,
): number {
  if (amount <= 0 || years <= 0) return 0;
  return Math.max(0, Math.round(
    amount * (Math.pow(1 + portfolioReturn, years) - Math.pow(1 + goalReturn, years))
  ));
}

// ============================================================
// GOAL DETAIL COMPUTATION
// ============================================================
export function computeGoalDetail(goal: Goal, currentYear: number): GoalDetail {
  const yearsToGoal = Math.max(0, goal.targetYear - currentYear);
  const futureCost = futureValue(goal.todayCost, goal.inflationRate, yearsToGoal);
  const instrument = selectInstrument(yearsToGoal, goal.category);
  // Grow existing corpus at the instrument's return rate to find the REAL gap
  const projectedFromExisting = goal.existingCorpus > 0
    ? futureValue(goal.existingCorpus, instrument.annualReturn, yearsToGoal)
    : 0;
  const gap = Math.max(0, futureCost - projectedFromExisting);
  const sip = yearsToGoal > 0 ? requiredMonthlySip(gap, instrument.annualReturn, yearsToGoal) : gap;
  const progressPercent = futureCost > 0
    ? Math.min(100, Math.round((projectedFromExisting / futureCost) * 100))
    : 0;

  return {
    ...goal,
    futureCost: Math.round(futureCost),
    requiredMonthlySip: Math.round(sip),
    instrument: instrument.name,
    returnRate: instrument.annualReturn,
    yearsToGoal,
    progressPercent,
    riskLevel: instrument.riskLevel,
    horizon: instrument.horizon,
  };
}

// ============================================================
// WATERFALL RETIREMENT SIMULATION
// When a goal SIP ends, its monthly amount is redirected to retirement.
// This simulates the corpus snowball: retirement SIP starts small and
// accelerates each time a goal finishes.
// ============================================================
export function simulateWaterfallRetirement(
  retirementSipMonthly: number,
  existingInvestmentMonthly: number,
  goalFreedSips: { targetYear: number; monthlyAmount: number }[],
  currentYear: number,
  retirementYear: number,
  annualReturn: number = 0.11,
): number {
  const years = Math.max(0, retirementYear - currentYear);
  let corpus = 0;
  // Base annual SIP = retirement allocation + already-running SIPs (both compound the whole way)
  let annualSip = (retirementSipMonthly + existingInvestmentMonthly) * 12;

  const sorted = [...goalFreedSips]
    .filter(g => g.targetYear < retirementYear && g.monthlyAmount > 0)
    .sort((a, b) => a.targetYear - b.targetYear);
  let i = 0;

  for (let y = 0; y < years; y++) {
    const calYear = currentYear + y;
    // Goals ending this year free their SIP into retirement from this year onward
    while (i < sorted.length && sorted[i].targetYear <= calYear) {
      annualSip += sorted[i].monthlyAmount * 12;
      i++;
    }
    corpus = corpus * (1 + annualReturn) + annualSip;
  }

  return Math.round(corpus);
}

// ============================================================
// TOTAL PROJECTED WEALTH AT RETIREMENT
// Year-by-year portfolio simulation: existing portfolio + all SIPs
// (goal SIPs while active + retirement SIP + existing SIPs) compounding
// at annualReturn, minus goal withdrawals at each target year.
// Used by the scenario lab to produce a single "projected wealth" number
// that accounts for everything — not just the retirement SIP projection.
// ============================================================
export function projectTotalWealthAtRetirement(
  longTermPortfolio: number,
  existingInvestmentMonthly: number,
  allocations: Allocation[],
  _goals: Goal[],
  _goalDetails: GoalDetail[],
  currentYear: number,
  retirementYear: number,
  annualReturn: number = 0.11,
  sipStepUpRate: number = 0,
): number {
  // Projects only the long-term retirement portfolio — consistent with the retirement card.
  // Goal SIPs live in separate short/medium-term instruments and net out to zero (invested then spent).
  // Uses the same monthly-compounding step-up formula as the retirement card so numbers align.
  const retireYears = Math.max(0, retirementYear - currentYear);
  if (retireYears <= 0) return Math.round(longTermPortfolio);

  const retirementSip = allocations.find(a => a.goalId === "__retirement__")?.monthlyAmount ?? 0;

  // Existing corpus growing at annualReturn for retireYears
  const portfolioFV = Math.round(longTermPortfolio * Math.pow(1 + annualReturn, retireYears));

  // Retirement SIP stepping up yearly (matches retirement card formula exactly)
  const retirementFV = stepUpSipFutureValue(retirementSip, annualReturn, retireYears, sipStepUpRate);

  // Existing committed SIPs + surplus buffer also step up with salary
  const otherFV = existingInvestmentMonthly > 0
    ? stepUpSipFutureValue(existingInvestmentMonthly, annualReturn, retireYears, sipStepUpRate)
    : 0;

  return Math.round(portfolioFV + retirementFV + otherFV);
}

// ============================================================
// ALLOCATION ENGINE
// Source: FINANCIAL_MODEL.md Section 3
// ============================================================
export function computeAllocations(
  profile: UserProfile,
  goals: Goal[],
  currentYear: number,
  retirementAge: number = 55,
  liquidSavings: number = 0,
  existingInvestmentMonthly: number = 0,
  // Optional: per-goal gap SIPs from buildFundingPlan (corpus-adjusted).
  // When provided, these replace full SIPs so the plan reflects actual cash needed.
  goalSipOverrides?: Record<string, number>,
): FeasibilityResult {
  // Step 0: Monthly surplus
  const totalAnnualIncome = profile.annualIncome + profile.spouseIncome;
  const annualTax = calculateTax(profile.annualIncome, profile.taxRegime)
    + (profile.spouseIncome > 0 ? calculateTax(profile.spouseIncome, profile.taxRegime) : 0);
  const monthlyPostTax = (totalAnnualIncome - annualTax) / 12;
  const monthlySurplus = monthlyPostTax - profile.monthlyExpenses - profile.existingEmis;

  const allocations: Allocation[] = [];
  // Existing SIPs are already committed — only the remainder is available for new goal allocation
  let remaining = monthlySurplus - existingInvestmentMonthly;
  const suggestions: string[] = [];

  // Emergency fund: liquid savings cover the target — only top up the gap
  const emergencyTarget = profile.monthlyExpenses * 6;
  const emergencyGap = Math.max(0, emergencyTarget - liquidSavings);
  let emergencyContribution = 0;
  let emergencyMonths = 0;
  if (emergencyGap > 0) {
    emergencyContribution = Math.min(remaining, profile.monthlyExpenses * 0.5);
    remaining -= emergencyContribution;
    emergencyMonths = Math.ceil(emergencyGap / (emergencyContribution || 1));
  }

  // Retirement (always 20% of original surplus, minimum)
  const retirementYears = Math.max(1, retirementAge - profile.age);
  const corpusNeeded = retirementCorpus(profile.monthlyExpenses, profile.age, retirementAge);
  const retirementInstrument = selectInstrument(retirementYears, "retirement");
  const idealRetirementSip = requiredMonthlySip(corpusNeeded, retirementInstrument.annualReturn, retirementYears);
  const minRetirementSip = monthlySurplus * 0.20;
  const retirementSip = Math.max(minRetirementSip, Math.min(idealRetirementSip, remaining * 0.5));
  remaining -= retirementSip;

  allocations.push({
    goalId: "__retirement__",
    goalName: "Retirement",
    monthlyAmount: Math.round(retirementSip),
    neededAmount: Math.round(idealRetirementSip),
    instrument: retirementInstrument.name,
    returnRate: retirementInstrument.annualReturn,
  });

  // Project retirement corpus with step-up SIP (salary growth drives step-up rate, varies by scenario)
  const sipStepUp = profile.salaryGrowthOverride !== undefined
    ? Math.min(0.10, profile.salaryGrowthOverride)
    : Math.min(0.10, getSalaryGrowthRate(profile.age));
  const projectedRetirementCorpus = stepUpSipFutureValue(
    retirementSip, retirementInstrument.annualReturn, retirementYears, sipStepUp,
  );

  // Pre-collect goal lists (needed for totalIdealSip and allocation below)
  const medicalGoal = goals.find(g => g.category === "parents_medical" && g.status === "active");
  // All non-medical, non-retirement active goals — including vacation — allocated nearest-first.
  const timeBound = goals
    .filter(g => g.status === "active" && g.category !== "parents_medical" && g.category !== "retirement")
    .sort((a, b) => a.targetYear - b.targetYear);

  // totalIdealSip: sum of ALL ideal SIPs across every goal + retirement + emergency.
  // When goalSipOverrides are provided (corpus-adjusted gap SIPs from buildFundingPlan),
  // use those — they're smaller because corpus covers part of each goal.
  const goalSip = (goalId: string, fullSip: number) =>
    goalSipOverrides?.[goalId] ?? fullSip;

  let totalIdealSip = idealRetirementSip + emergencyContribution;
  if (medicalGoal) totalIdealSip += medicalGoal.todayCost / 12;
  for (const g of timeBound) {
    const d = computeGoalDetail(g, currentYear);
    totalIdealSip += goalSip(g.id, d.requiredMonthlySip);
  }

  // Parents' medical (recurring, non-negotiable)
  if (medicalGoal) {
    const medicalMonthly = medicalGoal.todayCost / 12;
    const medicalAlloc = Math.min(remaining, medicalMonthly);
    remaining -= medicalAlloc;
    allocations.push({
      goalId: medicalGoal.id,
      goalName: medicalGoal.name,
      monthlyAmount: Math.round(medicalAlloc),
      neededAmount: Math.round(medicalMonthly),
      instrument: "Health Insurance Premium + Liquid Fund",
      returnRate: 0.05,
    });
  }

  // Time-bound goals (sorted by target year)
  for (const goal of timeBound) {
    const detail = computeGoalDetail(goal, currentYear);
    const needed = goalSip(goal.id, detail.requiredMonthlySip);
    const alloc = Math.min(remaining, needed);
    remaining -= alloc;

    allocations.push({
      goalId: goal.id,
      goalName: goal.name,
      monthlyAmount: Math.round(alloc),
      neededAmount: Math.round(needed),
      instrument: detail.instrument,
      returnRate: detail.returnRate,
    });

    if (alloc < needed * 0.9) {
      suggestions.push(
        `${goal.name} is underfunded by ₹${formatInr(needed - alloc)}/month. Consider deferring by 1-2 years or reducing the target.`
      );
    }
  }

  const totalRequiredSip = allocations.reduce((sum, a) => sum + a.monthlyAmount, 0) + emergencyContribution;
  // Gap = how much more you'd need to fund every goal at ideal SIP (vs available surplus after existing SIPs)
  const availableSurplus = monthlySurplus - existingInvestmentMonthly;
  const monthlyGap = Math.max(0, totalIdealSip - availableSurplus);

  // Feasibility suggestions
  if (monthlyGap > 0) {
    suggestions.push(`You're short by ₹${formatInr(monthlyGap)}/month. Consider:`);
    suggestions.push("1. Defer your most distant goal by 2 years");
    suggestions.push("2. Add spouse income if applicable");
    suggestions.push("3. Reduce cost tier (e.g., tier-2 city, India college instead of abroad)");
    suggestions.push("4. Push retirement age by 3 years (saves ~₹30-50L in corpus)");
  }

  if (retirementSip < idealRetirementSip * 0.8) {
    suggestions.push(
      `Retirement is underfunded. Ideal SIP: ₹${formatInr(idealRetirementSip)}, current: ₹${formatInr(retirementSip)}. Increase when earlier goals complete.`
    );
  }

  return {
    feasible: monthlyGap === 0,
    monthlySurplus: Math.round(monthlySurplus),
    totalRequiredSip: Math.round(totalRequiredSip),
    totalIdealSip: Math.round(totalIdealSip),
    monthlyGap: Math.round(monthlyGap),
    allocations,
    emergencyFundStatus: {
      target: Math.round(emergencyTarget),
      current: Math.round(liquidSavings),
      monthlyContribution: Math.round(emergencyContribution),
      monthsToFull: emergencyMonths,
    },
    retirementDetails: {
      corpusNeeded: Math.round(corpusNeeded),
      monthlySip: Math.round(retirementSip),
      projectedCorpus: Math.round(projectedRetirementCorpus),
    },
    suggestions,
  };
}

// ============================================================
// HELPERS
// ============================================================
export function getInflationRate(category: GoalCategory): number {
  return INFLATION_RATES[category];
}

export function formatInr(amount: number): string {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toFixed(0);
}

export function formatInrFull(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================================
// GOAL TEMPLATES
// Source: FINANCIAL_MODEL.md Section 2
// ============================================================
export interface GoalTemplate {
  name: string;
  category: GoalCategory;
  defaultCost: number;
  inflationRate: number;
  defaultYearsFromNow: number;
  isRecurring: boolean;
  description: string;
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    name: "Wedding",
    category: "wedding",
    defaultCost: 1500000,
    inflationRate: 0.08,
    defaultYearsFromNow: 3,
    isRecurring: false,
    description: "Venue, catering, gold, clothing, photography",
  },
  {
    name: "House",
    category: "house",
    defaultCost: 10000000,
    inflationRate: 0.07,
    defaultYearsFromNow: 5,
    isRecurring: false,
    description: "Enter property value — app calculates 20% down payment + 80% loan",
  },
  {
    name: "Car",
    category: "car",
    defaultCost: 1000000,
    inflationRate: 0.05,
    defaultYearsFromNow: 4,
    isRecurring: false,
    description: "Mid-segment vehicle purchase",
  },
  {
    name: "Child's School (K-12)",
    category: "education_school",
    defaultCost: 3000000,
    inflationRate: 0.10,
    defaultYearsFromNow: 5,
    isRecurring: false,
    description: "Total school fees over 15 years",
  },
  {
    name: "Child's College (India)",
    category: "education_college_india",
    defaultCost: 2000000,
    inflationRate: 0.10,
    defaultYearsFromNow: 20,
    isRecurring: false,
    description: "4-year UG at a good private college",
  },
  {
    name: "Child's College (Abroad)",
    category: "education_college_abroad",
    defaultCost: 6000000,
    inflationRate: 0.08,
    defaultYearsFromNow: 20,
    isRecurring: false,
    description: "4-year UG in US/UK including living expenses",
  },
  {
    name: "Parents' Medical",
    category: "parents_medical",
    defaultCost: 60000,
    inflationRate: 0.14,
    defaultYearsFromNow: 1,
    isRecurring: true,
    description: "Annual health insurance premium + emergency fund",
  },
  {
    name: "Annual Vacation",
    category: "vacation",
    defaultCost: 200000,
    inflationRate: 0.07,
    defaultYearsFromNow: 1,
    isRecurring: true,
    description: "Annual travel budget (domestic/international)",
  },
  {
    name: "Laptop / Electronics",
    category: "lifestyle_purchase",
    defaultCost: 100000,
    inflationRate: 0.06,
    defaultYearsFromNow: 1,
    isRecurring: false,
    description: "Laptop, phone, tablet, or gadget upgrade",
  },
  {
    name: "Home Furniture / Appliances",
    category: "lifestyle_purchase",
    defaultCost: 200000,
    inflationRate: 0.06,
    defaultYearsFromNow: 2,
    isRecurring: false,
    description: "Sofa, TV, fridge, washing machine, AC",
  },
  {
    name: "Loan / EMI",
    category: "custom",
    defaultCost: 240000,
    inflationRate: 0,
    defaultYearsFromNow: 1,
    isRecurring: true,
    description: "Car loan, personal loan, education loan, or any existing EMI (enter annual EMI = monthly × 12)",
  },
];
