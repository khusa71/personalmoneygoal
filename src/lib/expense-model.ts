/**
 * Expense model for Indian households
 * Covers: city tier adjustments, dependent family, house help, life stage transitions
 * Source: FINANCIAL_MODEL.md Section 1.5 + real-world Indian household data
 */

export type CityTier = "metro" | "tier1" | "tier2";

export interface ExpenseBreakdown {
  rent: number;
  food: number;
  transport: number;
  utilities: number;
  personal: number;
  insurance: number;
  maidAndHouseHelp: number;
  dependentParents: number;
  childcare: number;
  schoolFees: number;
  emi: number;
  miscellaneous: number;
  total: number;
}

// City tier multipliers relative to metro baseline
const CITY_MULTIPLIERS: Record<CityTier, number> = {
  metro: 1.0,    // Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Pune
  tier1: 0.72,   // Jaipur, Lucknow, Chandigarh, Kochi, Ahmedabad
  tier2: 0.52,   // Indore, Bhopal, Coimbatore, Mysuru, smaller cities
};

// Monthly expense baselines (Metro, 2024 ₹)
interface LifeStageExpenses {
  rent: number;
  food: number;
  transport: number;
  utilities: number;
  personal: number;
  insurance: number;
  maidAndHouseHelp: number;
  childcare: number;
  schoolFees: number;
}

const LIFE_STAGE_EXPENSES: Record<string, LifeStageExpenses> = {
  single: {
    rent: 15000,
    food: 8000,
    transport: 5000,
    utilities: 3000,
    personal: 7000,
    insurance: 2000,
    maidAndHouseHelp: 0,
    childcare: 0,
    schoolFees: 0,
  },
  married_no_kids: {
    rent: 22000,
    food: 12000,
    transport: 6000,
    utilities: 4000,
    personal: 12000,
    insurance: 5000,
    maidAndHouseHelp: 5000,
    childcare: 0,
    schoolFees: 0,
  },
  family_young_kids: {
    rent: 28000,
    food: 14000,
    transport: 7000,
    utilities: 5000,
    personal: 10000,
    insurance: 8000,
    maidAndHouseHelp: 8000,  // cook + nanny help
    childcare: 10000,         // daycare/creche
    schoolFees: 0,
  },
  family_school_kids: {
    rent: 30000,
    food: 16000,
    transport: 8000,
    utilities: 5000,
    personal: 10000,
    insurance: 10000,
    maidAndHouseHelp: 10000, // cook + cleaner + part-time help
    childcare: 0,
    schoolFees: 15000,       // per kid, monthly portion
  },
  family_two_kids: {
    rent: 35000,
    food: 20000,
    transport: 10000,
    utilities: 6000,
    personal: 12000,
    insurance: 12000,
    maidAndHouseHelp: 12000,
    childcare: 0,
    schoolFees: 30000,       // two kids
  },
  empty_nest: {
    rent: 20000,
    food: 12000,
    transport: 6000,
    utilities: 4000,
    personal: 10000,
    insurance: 15000,        // higher medical insurance
    maidAndHouseHelp: 8000,
    childcare: 0,
    schoolFees: 0,
  },
};

// Dependent family costs (monthly, metro baseline)
export interface DependentCosts {
  parentsLivingWithYou: boolean;      // parents living with you vs separate
  parentsMedicalPremium: number;      // annual premium for parents' health insurance
  monthlyParentSupport: number;       // monthly cash support if separate
  inLawsDependent: boolean;
}

const DEFAULT_DEPENDENT_COSTS = {
  parentsAtHome: 15000,          // food, medical, misc for 2 parents at home
  parentsSeparate: 20000,        // rent + living support for parents living separately
  parentsMedicalPremium: 40000,  // annual premium for 2 senior citizens, ₹10L cover
  inLawsAtHome: 12000,          // additional if in-laws also at home
};

export function estimateMonthlyExpenses(
  lifeStage: string,
  cityTier: CityTier,
  dependents: {
    parentsAtHome: boolean;
    parentsSeparateSupport: boolean;
    inLawsDependent: boolean;
  },
  existingEmi: number = 0,
  customOverrides?: Partial<LifeStageExpenses>,
): ExpenseBreakdown {
  const multiplier = CITY_MULTIPLIERS[cityTier];
  const base = LIFE_STAGE_EXPENSES[lifeStage] || LIFE_STAGE_EXPENSES.single;

  const adjusted = {
    rent: Math.round((customOverrides?.rent ?? base.rent) * multiplier),
    food: Math.round((customOverrides?.food ?? base.food) * multiplier),
    transport: Math.round((customOverrides?.transport ?? base.transport) * multiplier),
    utilities: Math.round((customOverrides?.utilities ?? base.utilities) * multiplier),
    personal: Math.round((customOverrides?.personal ?? base.personal) * multiplier),
    insurance: Math.round((customOverrides?.insurance ?? base.insurance) * multiplier),
    maidAndHouseHelp: Math.round(
      (customOverrides?.maidAndHouseHelp ?? base.maidAndHouseHelp) * multiplier
    ),
    childcare: Math.round((customOverrides?.childcare ?? base.childcare) * multiplier),
    schoolFees: Math.round((customOverrides?.schoolFees ?? base.schoolFees) * multiplier),
  };

  // Dependent costs (not city-adjusted — medical insurance is national)
  let dependentParents = 0;
  if (dependents.parentsAtHome) {
    dependentParents += DEFAULT_DEPENDENT_COSTS.parentsAtHome;
  }
  if (dependents.parentsSeparateSupport) {
    dependentParents += Math.round(DEFAULT_DEPENDENT_COSTS.parentsSeparate * multiplier);
  }
  if (dependents.inLawsDependent) {
    dependentParents += DEFAULT_DEPENDENT_COSTS.inLawsAtHome;
  }

  const miscellaneous = Math.round(
    (adjusted.rent + adjusted.food + adjusted.transport) * 0.05 // 5% buffer
  );

  const total =
    adjusted.rent +
    adjusted.food +
    adjusted.transport +
    adjusted.utilities +
    adjusted.personal +
    adjusted.insurance +
    adjusted.maidAndHouseHelp +
    adjusted.childcare +
    adjusted.schoolFees +
    dependentParents +
    existingEmi +
    miscellaneous;

  return {
    rent: adjusted.rent,
    food: adjusted.food,
    transport: adjusted.transport,
    utilities: adjusted.utilities,
    personal: adjusted.personal,
    insurance: adjusted.insurance,
    maidAndHouseHelp: adjusted.maidAndHouseHelp,
    dependentParents,
    childcare: adjusted.childcare,
    schoolFees: adjusted.schoolFees,
    emi: existingEmi,
    miscellaneous,
    total,
  };
}

/**
 * Projects how expenses change over the years as life stages shift
 * Accounts for: marriage, kids, school, empty nest
 */
export function projectExpenseTimeline(
  currentAge: number,
  currentMonthly: number,
  marriageAge: number | null,
  firstKidAge: number | null,
  secondKidAge: number | null,
  retireAge: number = 55,
): { age: number; monthlyExpense: number; stage: string }[] {
  const timeline: { age: number; monthlyExpense: number; stage: string }[] = [];
  const lifestyleInflation = 0.07;

  for (let age = currentAge; age <= retireAge; age++) {
    const yearsFromNow = age - currentAge;
    let baseExpense = currentMonthly * Math.pow(1 + lifestyleInflation, yearsFromNow);

    // Life stage bumps (on top of inflation)
    let stage = "single";
    if (marriageAge && age >= marriageAge) {
      baseExpense *= 1.4; // marriage lifestyle bump
      stage = "married";
    }
    if (firstKidAge && age >= firstKidAge && age < firstKidAge + 5) {
      baseExpense *= 1.25;
      stage = "young_family";
    }
    if (firstKidAge && age >= firstKidAge + 5) {
      baseExpense *= 1.35; // school starts
      stage = "school_family";
    }
    if (secondKidAge && age >= secondKidAge) {
      baseExpense *= 1.2; // second kid bump
      stage = "two_kids";
    }

    timeline.push({
      age,
      monthlyExpense: Math.round(baseExpense),
      stage,
    });
  }

  return timeline;
}

export function getMaidHelpBreakdown(cityTier: CityTier): {
  cook: number;
  cleaner: number;
  nanny: number;
  driver: number;
  total: string;
} {
  const m = CITY_MULTIPLIERS[cityTier];
  return {
    cook: Math.round(5000 * m),
    cleaner: Math.round(3000 * m),
    nanny: Math.round(8000 * m),
    driver: Math.round(12000 * m),
    total: `₹${Math.round(28000 * m).toLocaleString("en-IN")}/month for all`,
  };
}
