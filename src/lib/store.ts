/**
 * App state types and defaults.
 * Persistence is handled by useAppState hook + Supabase.
 */

import type { UserProfile, Goal } from "@/types";

export interface AppState {
  profile: UserProfile;
  goals: Goal[];
  liquidSavings: number;              // FD + bank savings + liquid funds
  longTermPortfolio: number;          // MF + stocks + bonds + PPF + NPS
  redeemablePortfolioPercent: number; // 0–50%: % of longTermPortfolio earmarked for goals
  retirementAge: number;
  // Onboarding tracking
  onboarded: boolean;
  // Dependent family
  parentsAtHome: boolean;
  parentsSeparateSupport: boolean;
  parentsMonthlySupportAmount: number;
  inLawsDependent: boolean;
  // Life events
  maritalStatus: "single" | "married" | "planning_marriage";
  marriageAge: number | null;
  numberOfKids: number;
  kidsAges: number[];
  planningMoreKids: boolean;
  nextKidInYears: number;
  firstKidAge: number | null;
  secondKidAge: number | null;
  // Health
  parentsHealthInsurance: boolean;
  parentsHealthPremium: number;
  // Finances
  existingInvestmentMonthly: number;
  // Lifestyle
  lifestyleMonthly: number;
}

export const DEFAULT_STATE: AppState = {
  profile: {
    name: "",
    age: 28,
    annualIncome: 3000000,
    monthlyExpenses: 40000,
    existingEmis: 0,
    cityTier: "metro",
    taxRegime: "new",
    spouseIncome: 0,
  },
  goals: [],
  liquidSavings: 0,
  longTermPortfolio: 0,
  redeemablePortfolioPercent: 0,
  retirementAge: 55,
  onboarded: false,
  parentsAtHome: false,
  parentsSeparateSupport: false,
  parentsMonthlySupportAmount: 0,
  inLawsDependent: false,
  maritalStatus: "single",
  marriageAge: null,
  numberOfKids: 0,
  kidsAges: [],
  planningMoreKids: false,
  nextKidInYears: 0,
  firstKidAge: null,
  secondKidAge: null,
  parentsHealthInsurance: false,
  parentsHealthPremium: 0,
  existingInvestmentMonthly: 0,
  lifestyleMonthly: 10000,
};

