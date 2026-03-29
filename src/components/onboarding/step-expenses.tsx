"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { formatInrFull, calculateTax } from "@/lib/financial-engine";
import type { OnboardingData } from "./types";

interface Props {
  data: OnboardingData;
  onChange: (data: Partial<OnboardingData>) => void;
}

const CITY_DEFAULTS: Record<string, Record<string, number>> = {
  metro: { rent: 18000, food: 10000, transport: 5000, utilities: 4000, lifestyle: 8000, maidAndHelp: 3000 },
  tier1: { rent: 12000, food: 7000, transport: 3500, utilities: 3000, lifestyle: 5000, maidAndHelp: 2000 },
  tier2: { rent: 8000, food: 5000, transport: 2500, utilities: 2500, lifestyle: 3000, maidAndHelp: 1500 },
};

const FIELDS: { key: keyof OnboardingData; label: string }[] = [
  { key: "rent", label: "Rent / Housing" },
  { key: "food", label: "Groceries & Food" },
  { key: "transport", label: "Transport" },
  { key: "utilities", label: "Utilities" },
  { key: "lifestyle", label: "Lifestyle" },
  { key: "maidAndHelp", label: "Maid & Help" },
  { key: "existingEmis", label: "EMIs" },
  { key: "otherExpenses", label: "Other" },
];

const inputCls =
  "h-auto bg-transparent border-0 border-b-2 border-zinc-200 rounded-none " +
  "focus-visible:border-zinc-900 focus-visible:ring-0 focus-visible:ring-offset-0 " +
  "px-0 py-1.5 text-xl font-bold tabular-nums transition-colors " +
  "placeholder:text-zinc-300 text-zinc-900 " +
  "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const labelCls = "text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400 mb-1 block";

export default function StepExpenses({ data, onChange }: Props) {
  const defaults = CITY_DEFAULTS[data.cityTier] || CITY_DEFAULTS.metro;

  const totalMonthly =
    data.rent + data.food + data.transport + data.utilities +
    data.lifestyle + data.maidAndHelp + data.existingEmis + data.otherExpenses;

  const annualTax = data.annualIncome > 0 ? calculateTax(data.annualIncome, data.taxRegime) : 0;
  const spouseTax =
    data.spouseWorks && data.spouseIncome > 0
      ? calculateTax(data.spouseIncome, data.taxRegime)
      : 0;
  const totalIncome = data.annualIncome + (data.spouseWorks ? data.spouseIncome : 0);
  const monthlyPostTax = (totalIncome - annualTax - spouseTax) / 12;
  const surplus = monthlyPostTax - totalMonthly;

  const prefillDefaults = () => {
    onChange({
      rent: defaults.rent,
      food: defaults.food,
      transport: defaults.transport,
      utilities: defaults.utilities,
      lifestyle: defaults.lifestyle,
      maidAndHelp: defaults.maidAndHelp,
    });
  };

  const cityLabel =
    data.cityTier === "metro" ? "metro" : data.cityTier === "tier1" ? "tier-1" : "tier-2";

  return (
    <div className="space-y-5">
      {/* Pre-fill */}
      <Button
        variant="outline"
        onClick={prefillDefaults}
        className="w-full border-dashed font-bold uppercase tracking-[0.1em] text-xs text-zinc-500"
      >
        {totalMonthly > 0 ? "Reset to typical" : "Pre-fill typical"} {cityLabel} expenses
      </Button>

      {/* Expense grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {FIELDS.map(({ key, label }) => (
          <div key={key}>
            <Label className={labelCls}>{label}</Label>
            <Input
              type="number"
              placeholder="0"
              value={(data[key] as number) || ""}
              onChange={(e) => onChange({ [key]: parseInt(e.target.value) || 0 })}
              className={inputCls}
            />
          </div>
        ))}
      </div>

      {/* Summary */}
      <Card className="rounded-lg ring-0 shadow-[0_8px_24px_rgba(0,0,0,0.04)] gap-0 py-0">
        <CardContent className="p-4">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-bold text-zinc-900">Total outflow</span>
            <span className="text-xl font-extrabold tabular-nums text-zinc-900">
              {formatInrFull(totalMonthly)}
            </span>
          </div>
          {data.annualIncome > 0 && (
            <>
              <div className="h-px bg-zinc-100 my-2" />
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-zinc-500">Monthly surplus</span>
                <span
                  className={`text-xl font-extrabold tabular-nums ${
                    surplus >= 0 ? "text-zinc-900" : "text-red-600"
                  }`}
                >
                  {formatInrFull(Math.round(surplus))}
                </span>
              </div>
              {surplus > 0 && (
                <p className="text-xs text-zinc-400 mt-1">
                  This is what we&apos;ll allocate across your goals.
                </p>
              )}
              {surplus < 0 && (
                <p className="text-xs text-red-500 font-medium mt-1">
                  Spending more than you earn.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
