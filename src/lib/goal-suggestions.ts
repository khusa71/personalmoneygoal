import type { AppState } from "@/lib/store";
import type { GoalCategory } from "@/types";
import { GOAL_TEMPLATES, type GoalTemplate } from "@/lib/financial-engine";

const CITY_MULTIPLIERS: Record<string, number> = {
  metro: 1.0,
  tier1: 0.72,
  tier2: 0.52,
};

export interface SuggestedGoal {
  template: GoalTemplate;
  reason: string;
  adjustedCost: number;
  suggestedTargetYear: number;
  priority: number; // lower = more important
  urgent: boolean;
  alreadyAdded: boolean;
}

function findTemplate(category: GoalCategory): GoalTemplate | undefined {
  return GOAL_TEMPLATES.find((t) => t.category === category);
}

function hasGoalCategory(state: AppState, category: GoalCategory): boolean {
  return state.goals.some((g) => g.category === category && g.status === "active");
}

export function generateSuggestions(state: AppState): SuggestedGoal[] {
  const suggestions: SuggestedGoal[] = [];
  const currentYear = new Date().getFullYear();
  const multiplier = CITY_MULTIPLIERS[state.profile.cityTier] ?? 1.0;

  // Wedding — if planning marriage
  if (state.maritalStatus === "planning_marriage") {
    const t = findTemplate("wedding");
    if (t) {
      suggestions.push({
        template: t,
        reason: "You're planning to get married",
        adjustedCost: Math.round(t.defaultCost * multiplier),
        suggestedTargetYear: currentYear + 2,
        priority: 1,
        urgent: false,
        alreadyAdded: hasGoalCategory(state, "wedding"),
      });
    }
  }

  // Children's School — for existing young kids
  if (state.numberOfKids > 0) {
    const youngestAge = Math.min(...state.kidsAges.filter((a) => a >= 0));
    if (youngestAge < 5) {
      const t = findTemplate("education_school");
      if (t) {
        const yearsUntilSchool = Math.max(1, 5 - youngestAge);
        suggestions.push({
          template: t,
          reason: `Your ${youngestAge > 0 ? youngestAge + "-year-old" : "newborn"} starts school in ~${yearsUntilSchool} years`,
          adjustedCost: Math.round(t.defaultCost * multiplier),
          suggestedTargetYear: currentYear + yearsUntilSchool,
          priority: 2,
          urgent: yearsUntilSchool <= 2,
          alreadyAdded: hasGoalCategory(state, "education_school"),
        });
      }
    }

    // Children's College — for kids under 15
    const kidsUnder15 = state.kidsAges.filter((a) => a < 15);
    if (kidsUnder15.length > 0) {
      const oldestUnder15 = Math.max(...kidsUnder15);
      const t = findTemplate("education_college_india");
      if (t) {
        const yearsToCollege = Math.max(1, 18 - oldestUnder15);
        suggestions.push({
          template: t,
          reason: `Your ${oldestUnder15}-year-old reaches college age in ~${yearsToCollege} years`,
          adjustedCost: Math.round(t.defaultCost * multiplier),
          suggestedTargetYear: currentYear + yearsToCollege,
          priority: 3,
          urgent: false,
          alreadyAdded: hasGoalCategory(state, "education_college_india"),
        });
      }
    }
  }

  // Planning future kids — school + college
  if (state.planningMoreKids && state.nextKidInYears > 0) {
    const schoolTemplate = findTemplate("education_school");
    if (schoolTemplate) {
      const yearsToSchool = state.nextKidInYears + 5;
      suggestions.push({
        template: schoolTemplate,
        reason: `Future child's school fees (kid expected in ~${state.nextKidInYears} years)`,
        adjustedCost: Math.round(schoolTemplate.defaultCost * multiplier),
        suggestedTargetYear: currentYear + yearsToSchool,
        priority: 4,
        urgent: false,
        alreadyAdded: false, // future kid, always show
      });
    }

    const collegeTemplate = findTemplate("education_college_india");
    if (collegeTemplate) {
      const yearsToCollege = state.nextKidInYears + 18;
      suggestions.push({
        template: collegeTemplate,
        reason: `Future child's college fund (needed in ~${yearsToCollege} years)`,
        adjustedCost: Math.round(collegeTemplate.defaultCost * multiplier),
        suggestedTargetYear: currentYear + yearsToCollege,
        priority: 5,
        urgent: false,
        alreadyAdded: false,
      });
    }
  }

  // Parents' Medical — URGENT if parents dependent but no insurance
  if ((state.parentsAtHome || state.parentsSeparateSupport) && !state.parentsHealthInsurance) {
    const t = findTemplate("parents_medical");
    if (t) {
      suggestions.push({
        template: t,
        reason: "Your parents don't have health insurance — one emergency can wipe out years of savings",
        adjustedCost: 60000, // base premium, not city-adjusted
        suggestedTargetYear: currentYear + 1,
        priority: 0, // highest priority
        urgent: true,
        alreadyAdded: hasGoalCategory(state, "parents_medical"),
      });
    }
  }

  // Parents' Medical — normal if they have insurance
  if (state.parentsHealthInsurance && state.parentsHealthPremium > 0) {
    const t = findTemplate("parents_medical");
    if (t) {
      suggestions.push({
        template: t,
        reason: "Your parents' health insurance premium needs annual funding",
        adjustedCost: state.parentsHealthPremium,
        suggestedTargetYear: currentYear + 1,
        priority: 1,
        urgent: false,
        alreadyAdded: hasGoalCategory(state, "parents_medical"),
      });
    }
  }

  // House — common for under-32
  if (state.profile.age < 35) {
    const t = findTemplate("house");
    if (t) {
      suggestions.push({
        template: t,
        reason: "House down payment — most people target this in their early 30s",
        adjustedCost: Math.round(t.defaultCost * multiplier),
        suggestedTargetYear: currentYear + 5,
        priority: 3,
        urgent: false,
        alreadyAdded: hasGoalCategory(state, "house"),
      });
    }
  }

  // Car
  if (!hasGoalCategory(state, "car")) {
    const t = findTemplate("car");
    if (t) {
      suggestions.push({
        template: t,
        reason: "Vehicle purchase or upgrade",
        adjustedCost: Math.round(t.defaultCost * multiplier),
        suggestedTargetYear: currentYear + 3,
        priority: 5,
        urgent: false,
        alreadyAdded: false,
      });
    }
  }

  // Vacation
  if (!hasGoalCategory(state, "vacation")) {
    const t = findTemplate("vacation");
    if (t) {
      suggestions.push({
        template: t,
        reason: "Annual travel fund",
        adjustedCost: Math.round(t.defaultCost * multiplier),
        suggestedTargetYear: currentYear + 1,
        priority: 6,
        urgent: false,
        alreadyAdded: false,
      });
    }
  }

  // Sort: urgent first, then by priority, already-added last
  return suggestions.sort((a, b) => {
    if (a.alreadyAdded !== b.alreadyAdded) return a.alreadyAdded ? 1 : -1;
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    return a.priority - b.priority;
  });
}
