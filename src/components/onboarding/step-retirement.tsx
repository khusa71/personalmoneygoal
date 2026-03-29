"use client";

import { Button } from "@/components/ui/button";
import {
  formatInrFull,
  retirementCorpus,
  requiredMonthlySip,
  futureValue,
  calculateTax,
} from "@/lib/financial-engine";
import type { OnboardingData } from "./types";

interface Props {
  data: OnboardingData;
  onChange: (data: Partial<OnboardingData>) => void;
}

export default function StepRetirement({ data, onChange }: Props) {
  const totalExpenses =
    data.rent + data.food + data.transport + data.utilities +
    data.lifestyle + data.maidAndHelp + data.existingEmis + data.otherExpenses;
  const dependentCost =
    (data.parentsLivingWith ? 15000 : 0) +
    (data.parentsSupportSeparately ? data.parentsMonthlySupportAmount || 20000 : 0) +
    (data.inLawsDependent ? 12000 : 0);
  const monthlyExpenses = totalExpenses + dependentCost;

  const ages = [45, 50, 55, 58, 60];

  const calculations = ages.map((retireAge) => {
    const years = Math.max(1, retireAge - data.age);
    const corpus = retirementCorpus(monthlyExpenses, data.age, retireAge);
    const elderCare =
      data.parentsLivingWith || data.parentsSupportSeparately
        ? futureValue(25000 * 12, 0.14, years)
        : 0;
    const totalNeeded = corpus + elderCare;
    const sip = requiredMonthlySip(totalNeeded, 0.11, years);
    const annualTax = calculateTax(data.annualIncome, data.taxRegime);
    const spouseTax = data.spouseWorks ? calculateTax(data.spouseIncome, data.taxRegime) : 0;
    const surplus =
      ((data.annualIncome + (data.spouseWorks ? data.spouseIncome : 0)) - annualTax - spouseTax) /
        12 -
      monthlyExpenses;
    const percentOfSurplus = surplus > 0 ? Math.round((sip / surplus) * 100) : 0;
    return { retireAge, years, corpus: totalNeeded, sip, percentOfSurplus };
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        When work becomes optional — enough to sustain your lifestyle for 30+ years.
      </p>

      <div className="space-y-2">
        {calculations.map(({ retireAge, years, corpus, sip, percentOfSurplus }) => {
          const isSelected = data.retirementAge === retireAge;
          return (
            <Button
              key={retireAge}
              variant={isSelected ? "outline" : "ghost"}
              onClick={() => onChange({ retirementAge: retireAge })}
              className={`w-full h-auto text-left flex-col items-start justify-start px-5 py-3.5 whitespace-normal transition-all ${
                isSelected
                  ? "border-2 border-zinc-900 bg-zinc-50 hover:bg-zinc-50"
                  : "border border-zinc-200 hover:border-zinc-400 hover:bg-transparent"
              }`}
            >
              <div className="flex items-center justify-between gap-4 w-full">
                <div className="flex items-baseline gap-3 min-w-0">
                  <span className="text-2xl font-extrabold text-zinc-900 tabular-nums">
                    {retireAge}
                  </span>
                  <span className="text-xs text-zinc-400">{years}yr away</span>
                </div>
                <div className="flex items-baseline gap-5 text-right shrink-0">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Corpus</span>
                    <span className="text-sm font-bold tabular-nums text-zinc-700">
                      {formatInrFull(Math.round(corpus))}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">SIP/mo</span>
                    <span className="text-sm font-bold tabular-nums text-zinc-700">
                      {formatInrFull(Math.round(sip))}
                    </span>
                  </div>
                  <span
                    className={`text-xl font-extrabold tabular-nums ${
                      percentOfSurplus <= 25
                        ? "text-zinc-900"
                        : percentOfSurplus <= 40
                        ? "text-zinc-500"
                        : "text-red-600"
                    }`}
                  >
                    {percentOfSurplus}%
                  </span>
                </div>
              </div>
              {percentOfSurplus > 50 && (
                <p className="text-xs text-red-500 font-medium mt-1">Takes &gt;50% of surplus</p>
              )}
            </Button>
          );
        })}
      </div>

      <p className="text-xs text-zinc-400">
        Expenses grow 7%/yr &middot; 3.5% withdrawal rate &middot; 11% return
        {(data.parentsLivingWith || data.parentsSupportSeparately) &&
          " · Elder care at 14% medical inflation"}
      </p>
    </div>
  );
}
