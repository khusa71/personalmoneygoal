"use client";

import { useState, useCallback } from "react";
import { STEPS, INITIAL_ONBOARDING } from "./types";
import { Button } from "@/components/ui/button";
import WelcomeScreen from "./WelcomeScreen";
import type { OnboardingData } from "./types";
import type { AppState } from "@/lib/store";
import StepAbout from "./step-about";
import StepIncome from "./step-income";
import StepExpenses from "./step-expenses";
import StepDependents from "./step-dependents";
import StepSafety from "./step-safety";
import StepRetirement from "./step-retirement";

interface OnboardingProps {
  state: AppState;
  onComplete: (state: AppState) => void;
}

const STEP_LABELS = [
  "Basics", "Income", "Expenses", "Household", "Safety Net", "Freedom",
];

const STEP_TITLES = [
  "About you",
  "What comes in",
  "What goes out",
  "Your household",
  "Safety net",
  "Freedom age",
];

function canProceed(step: number, data: OnboardingData): { ok: boolean; reason?: string } {
  switch (step) {
    case 0:
      if (!data.name.trim()) return { ok: false, reason: "Enter your name" };
      if (data.age < 18 || data.age > 65) return { ok: false, reason: "Age must be between 18 and 65" };
      return { ok: true };
    case 1:
      if (data.annualIncome <= 0) return { ok: false, reason: "Enter your income" };
      if (data.spouseWorks && data.spouseIncome <= 0) return { ok: false, reason: "Enter spouse income or mark as not working" };
      return { ok: true };
    case 2: {
      const total = data.rent + data.food + data.transport + data.utilities +
        data.lifestyle + data.maidAndHelp + data.existingEmis + data.otherExpenses;
      if (total <= 0) return { ok: false, reason: "Enter at least one expense" };
      return { ok: true };
    }
    case 3:
      return { ok: true };
    case 4:
      return { ok: true };
    case 5:
      if (data.retirementAge <= data.age + 5) return { ok: false, reason: "Retirement age must be at least 5 years from now" };
      return { ok: true };
    default:
      return { ok: true };
  }
}

export default function Onboarding({ state, onComplete }: OnboardingProps) {
  const [showWelcome, setShowWelcome] = useState(!state.onboarded);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [data, setData] = useState<OnboardingData>(() => {
    if (state.onboarded) {
      return {
        name: state.profile.name,
        age: state.profile.age,
        cityTier: state.profile.cityTier,
        annualIncome: state.profile.annualIncome,
        spouseWorks: state.profile.spouseIncome > 0,
        spouseIncome: state.profile.spouseIncome,
        taxRegime: state.profile.taxRegime,
        rent: 0, food: 0, transport: 0, utilities: 0,
        lifestyle: state.lifestyleMonthly,
        maidAndHelp: 0,
        existingEmis: state.profile.existingEmis,
        otherExpenses: 0,
        maritalStatus: state.maritalStatus,
        parentsLivingWith: state.parentsAtHome,
        parentsSupportSeparately: state.parentsSeparateSupport,
        parentsMonthlySupportAmount: state.parentsMonthlySupportAmount || 20000,
        inLawsDependent: state.inLawsDependent,
        numberOfKids: state.numberOfKids,
        kidsAges: state.kidsAges,
        planningMoreKids: state.planningMoreKids,
        nextKidInYears: state.nextKidInYears,
        liquidSavings: state.liquidSavings,
        longTermPortfolio: state.longTermPortfolio,
        redeemablePortfolioPercent: state.redeemablePortfolioPercent,
        existingInvestmentMonthly: state.existingInvestmentMonthly,
        healthInsuranceCover: 0,
        parentsHealthInsurance: state.parentsHealthInsurance,
        parentsHealthPremium: state.parentsHealthPremium,
        retirementAge: state.retirementAge,
      };
    }
    return INITIAL_ONBOARDING;
  });

  const onChange = useCallback((partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const validation = canProceed(step, data);

  const handleNext = () => {
    if (!validation.ok) return;
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep(step + 1);
    } else {
      const totalExpenses = data.rent + data.food + data.transport + data.utilities +
        data.lifestyle + data.maidAndHelp + data.otherExpenses;
      const newState: AppState = {
        ...state,
        profile: {
          name: data.name,
          age: data.age,
          annualIncome: data.annualIncome,
          monthlyExpenses: totalExpenses,
          existingEmis: data.existingEmis,
          cityTier: data.cityTier,
          taxRegime: data.taxRegime,
          spouseIncome: data.spouseWorks ? data.spouseIncome : 0,
        },
        liquidSavings: data.liquidSavings,
        longTermPortfolio: data.longTermPortfolio,
        redeemablePortfolioPercent: data.redeemablePortfolioPercent,
        retirementAge: data.retirementAge,
        parentsAtHome: data.parentsLivingWith,
        parentsSeparateSupport: data.parentsSupportSeparately,
        parentsMonthlySupportAmount: data.parentsMonthlySupportAmount,
        inLawsDependent: data.inLawsDependent,
        maritalStatus: data.maritalStatus,
        marriageAge: data.maritalStatus === "planning_marriage" ? data.age + 2 : null,
        numberOfKids: data.numberOfKids,
        kidsAges: data.kidsAges,
        planningMoreKids: data.planningMoreKids,
        nextKidInYears: data.nextKidInYears,
        firstKidAge: data.numberOfKids > 0 ? data.age - data.kidsAges[0] : (data.planningMoreKids ? data.age + data.nextKidInYears : null),
        secondKidAge: data.numberOfKids > 1 ? data.age - data.kidsAges[1] : null,
        parentsHealthInsurance: data.parentsHealthInsurance,
        parentsHealthPremium: data.parentsHealthPremium,
        existingInvestmentMonthly: data.existingInvestmentMonthly,
        lifestyleMonthly: data.lifestyle,
        onboarded: true,
      };
      onComplete(newState);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0: return <StepAbout data={data} onChange={onChange} />;
      case 1: return <StepIncome data={data} onChange={onChange} />;
      case 2: return <StepExpenses data={data} onChange={onChange} />;
      case 3: return <StepDependents data={data} onChange={onChange} />;
      case 4: return <StepSafety data={data} onChange={onChange} />;
      case 5: return <StepRetirement data={data} onChange={onChange} />;
      default: return null;
    }
  };

  if (showWelcome) {
    return <WelcomeScreen onStart={() => setShowWelcome(false)} />;
  }

  const stepNum = String(step + 1).padStart(2, "0");

  return (
    <>
      <style>{`
        @keyframes obStepIn {
          from { opacity: 0; transform: translateX(var(--enter-x)); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .ob-step-fwd { --enter-x: 28px; animation: obStepIn 0.38s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .ob-step-bck { --enter-x: -28px; animation: obStepIn 0.38s cubic-bezier(0.16, 1, 0.3, 1) both; }

        .ob-seg-fill   { transition: background-color 0.4s ease; }
        .ob-seg-label  { transition: color 0.3s ease; }

        .ob-next-btn {
          position: relative;
          overflow: hidden;
          transition: background 0.15s ease, transform 0.1s ease, opacity 0.2s ease;
        }
        .ob-next-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 55%);
          pointer-events: none;
        }
        .ob-next-btn:not(:disabled):hover  { background: #09090b; }
        .ob-next-btn:not(:disabled):active { transform: scale(0.97); }
      `}</style>

      <div className="h-screen flex flex-col bg-[#FAFAF8]">
        {/* Top nav */}
        <nav className="shrink-0 bg-white/80 backdrop-blur-md border-b border-zinc-200/40 flex justify-between items-center px-6 h-[52px]">
          <div className="flex items-center gap-4">
          {step > 0 ? (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleBack}
                aria-label="Back"
                className="text-zinc-500 hover:text-zinc-900"
              >
                &larr;
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowWelcome(true)}
                aria-label="Close"
                className="text-zinc-400 hover:text-zinc-900"
              >
                &times;
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-zinc-900 flex items-center justify-center rounded-[2px] shrink-0">
                <span className="text-white text-[7px] font-black leading-none">FG</span>
              </div>
              <span className="text-sm font-black tracking-[-0.04em] text-zinc-900">FinGoal</span>
            </div>
          </div>
          <span className="text-[11px] font-bold tabular-nums text-zinc-400 tracking-[0.1em]">
            {stepNum} / {String(STEPS.length).padStart(2, "0")}
          </span>
        </nav>

        {/* Segmented progress */}
        <div className="shrink-0 bg-white/80 backdrop-blur-sm border-b border-zinc-100 px-6 pt-2.5 pb-2">
          <div className="max-w-xl mx-auto">
            {/* Segment pills */}
            <div className="flex gap-1.5 mb-1.5">
              {STEP_LABELS.map((_, i) => (
                <div
                  key={i}
                  className={`h-[3px] flex-1 rounded-full ob-seg-fill ${
                    i < step
                      ? "bg-zinc-900"
                      : i === step
                      ? "bg-zinc-500"
                      : "bg-zinc-150"
                  }`}
                  style={i >= step ? { backgroundColor: i === step ? "#71717a" : "#f0f0f0" } : undefined}
                />
              ))}
            </div>
            {/* Step labels */}
            <div className="flex gap-1.5">
              {STEP_LABELS.map((label, i) => (
                <div key={label} className="flex-1 text-center overflow-hidden">
                  <span
                    className={`ob-seg-label text-[7.5px] font-bold uppercase tracking-[0.06em] leading-none whitespace-nowrap ${
                      i < step
                        ? "text-zinc-400"
                        : i === step
                        ? "text-zinc-900"
                        : "text-zinc-300"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-xl mx-auto px-6 py-8">
            {/* Step header */}
            <div className="relative mb-8 overflow-hidden">
              {/* Ghost step number */}
              <div
                className="absolute -right-1 -top-2 font-black text-zinc-900 leading-none pointer-events-none select-none"
                style={{ fontSize: "90px", opacity: 0.04, letterSpacing: "-0.06em" }}
                aria-hidden
              >
                {stepNum}
              </div>

              <div className="relative">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 block mb-1">
                  {STEP_LABELS[step]}
                </span>
                <h2 className="text-[2rem] font-extrabold tracking-[-0.03em] leading-tight text-zinc-900">
                  {STEP_TITLES[step]}
                </h2>
              </div>
            </div>

            {/* Animated step content */}
            <div
              key={step}
              className={direction > 0 ? "ob-step-fwd" : "ob-step-bck"}
            >
              {renderStep()}
            </div>
          </div>
        </main>

        {/* Fixed bottom bar */}
        <footer className="shrink-0 border-t border-zinc-200/60 bg-white/90 backdrop-blur-md">
          <div className="max-w-xl mx-auto px-6 py-3.5 flex justify-between items-center">
            {step > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-zinc-400 font-bold uppercase tracking-[0.1em] hover:text-zinc-900 px-3"
              >
                &larr; Back
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              {!validation.ok && validation.reason && (
                <p className="text-[11px] text-red-500 font-medium">{validation.reason}</p>
              )}
              <Button
                onClick={handleNext}
                disabled={!validation.ok}
                className="ob-next-btn px-8 py-2.5 h-auto rounded-sm text-xs font-black uppercase tracking-[0.12em]"
              >
                {step === STEPS.length - 1
                  ? (state.onboarded ? "Save changes" : "Show me the math")
                  : "Continue"}
              </Button>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
