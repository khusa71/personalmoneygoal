/**
 * Onboarding data model — each step populates a section.
 * The full OnboardingData becomes the AppState profile when done.
 */

export interface OnboardingData {
  // Step 1: About You
  name: string;
  age: number;
  cityTier: "metro" | "tier1" | "tier2";

  // Step 2: What Comes In
  annualIncome: number;
  spouseWorks: boolean;
  spouseIncome: number; // 0 if spouseWorks is false
  taxRegime: "old" | "new";

  // Step 3: What Goes Out (itemized monthly)
  rent: number;
  food: number;
  transport: number;
  utilities: number; // electricity, water, internet, phone
  lifestyle: number; // dining, shopping, subscriptions, gym, entertainment
  maidAndHelp: number; // cook, cleaner, nanny, driver
  existingEmis: number; // car EMI, personal loan, credit card EMIs
  otherExpenses: number; // anything else recurring

  // Step 4: Who Depends on You
  maritalStatus: "single" | "married" | "planning_marriage";
  parentsLivingWith: boolean;
  parentsSupportSeparately: boolean;
  parentsMonthlySupportAmount: number;
  inLawsDependent: boolean;
  numberOfKids: number;
  kidsAges: number[]; // ages of existing kids
  planningMoreKids: boolean;
  nextKidInYears: number; // 0 if not planning

  // Step 5: What You Already Have
  liquidSavings: number;              // FD + bank savings + liquid funds → emergency buffer + short-term goals
  longTermPortfolio: number;          // MF + stocks + bonds + PPF + NPS → stays invested
  redeemablePortfolioPercent: number; // 0–50%: % of longTermPortfolio user can apply toward goals
  existingInvestmentMonthly: number; // current SIPs already running
  healthInsuranceCover: number; // in lakhs, for self
  parentsHealthInsurance: boolean;
  parentsHealthPremium: number; // annual

  // Step 6: When Do You Want to Stop
  retirementAge: number;
}

export const INITIAL_ONBOARDING: OnboardingData = {
  name: "",
  age: 28,
  cityTier: "metro",

  annualIncome: 0,
  spouseWorks: false,
  spouseIncome: 0,
  taxRegime: "new",

  rent: 0,
  food: 0,
  transport: 0,
  utilities: 0,
  lifestyle: 0,
  maidAndHelp: 0,
  existingEmis: 0,
  otherExpenses: 0,

  maritalStatus: "single",
  parentsLivingWith: false,
  parentsSupportSeparately: false,
  parentsMonthlySupportAmount: 0,
  inLawsDependent: false,
  numberOfKids: 0,
  kidsAges: [],
  planningMoreKids: false,
  nextKidInYears: 0,

  liquidSavings: 0,
  longTermPortfolio: 0,
  redeemablePortfolioPercent: 0,
  existingInvestmentMonthly: 0,
  healthInsuranceCover: 0,
  parentsHealthInsurance: false,
  parentsHealthPremium: 0,

  retirementAge: 55,
};

export const STEPS = [
  { id: "about", title: "About You", subtitle: "Let's start with the basics" },
  { id: "income", title: "What Comes In", subtitle: "Your earning power" },
  { id: "expenses", title: "What Goes Out", subtitle: "Where your money disappears every month" },
  { id: "dependents", title: "Who Depends on You", subtitle: "The people your money supports" },
  { id: "safety", title: "What You Already Have", subtitle: "Your safety net and existing investments" },
  { id: "retirement", title: "When Do You Want to Stop", subtitle: "Your freedom number" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];
