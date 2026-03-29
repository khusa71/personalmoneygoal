"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { calculateTax, formatInrFull } from "@/lib/financial-engine";
import type { OnboardingData } from "./types";

interface Props {
  data: OnboardingData;
  onChange: (data: Partial<OnboardingData>) => void;
}

const SALARY_CHIPS = [
  { label: "5L", value: 500000 },
  { label: "8L", value: 800000 },
  { label: "12L", value: 1200000 },
  { label: "15L", value: 1500000 },
  { label: "20L", value: 2000000 },
  { label: "30L", value: 3000000 },
  { label: "40L+", value: 4000000 },
];

const SPOUSE_CHIPS = [
  { label: "5L", value: 500000 },
  { label: "8L", value: 800000 },
  { label: "12L", value: 1200000 },
  { label: "20L", value: 2000000 },
  { label: "25L+", value: 2500000 },
];

const inputCls =
  "h-auto bg-transparent border-0 border-b-2 border-zinc-200 rounded-none " +
  "focus-visible:border-zinc-900 focus-visible:ring-0 focus-visible:ring-offset-0 " +
  "px-0 py-2 text-2xl font-bold tabular-nums transition-colors " +
  "placeholder:text-zinc-300 placeholder:text-base placeholder:font-normal text-zinc-900 " +
  "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const labelCls = "text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-3 block";

function Chips({
  items,
  current,
  onSelect,
}: {
  items: { label: string; value: number }[];
  current: number;
  onSelect: (v: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {items.map((b) => (
        <Button
          key={b.value}
          variant={current === b.value ? "default" : "secondary"}
          size="sm"
          onClick={() => onSelect(b.value)}
          className="font-bold"
        >
          {b.label}
        </Button>
      ))}
    </div>
  );
}

export default function StepIncome({ data, onChange }: Props) {
  const annualTax = data.annualIncome > 0 ? calculateTax(data.annualIncome, data.taxRegime) : 0;
  const spouseTax =
    data.spouseWorks && data.spouseIncome > 0
      ? calculateTax(data.spouseIncome, data.taxRegime)
      : 0;
  const totalMonthlyPostTax =
    ((data.annualIncome + (data.spouseWorks ? data.spouseIncome : 0)) - annualTax - spouseTax) / 12;

  return (
    <div className="space-y-6">
      {/* Annual income */}
      <div>
        <Label className={labelCls}>Annual income (CTC)</Label>
        <Chips
          items={SALARY_CHIPS}
          current={data.annualIncome}
          onSelect={(v) => onChange({ annualIncome: v })}
        />
        <div className="relative">
          <span className="absolute left-0 bottom-2 text-sm text-zinc-400">Rs</span>
          <Input
            type="number"
            placeholder="Or type exact amount"
            value={data.annualIncome || ""}
            onChange={(e) => onChange({ annualIncome: parseInt(e.target.value) || 0 })}
            className={inputCls + " pl-10"}
          />
        </div>
      </div>

      {/* Spouse + Tax */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <Label className={labelCls}>Spouse earns?</Label>
          <div className="flex gap-2">
            <Button
              variant={!data.spouseWorks ? "default" : "secondary"}
              size="sm"
              onClick={() => onChange({ spouseWorks: false, spouseIncome: 0 })}
              className="flex-1 font-bold"
            >
              No
            </Button>
            <Button
              variant={data.spouseWorks ? "default" : "secondary"}
              size="sm"
              onClick={() => onChange({ spouseWorks: true })}
              className="flex-1 font-bold"
            >
              Yes
            </Button>
          </div>
        </div>
        <div>
          <Label className={labelCls}>Tax regime</Label>
          <div className="flex gap-2">
            <Button
              variant={data.taxRegime === "new" ? "default" : "secondary"}
              size="sm"
              onClick={() => onChange({ taxRegime: "new" })}
              className="flex-1 font-bold"
            >
              New
            </Button>
            <Button
              variant={data.taxRegime === "old" ? "default" : "secondary"}
              size="sm"
              onClick={() => onChange({ taxRegime: "old" })}
              className="flex-1 font-bold"
            >
              Old
            </Button>
          </div>
        </div>
      </div>

      {/* Spouse income */}
      {data.spouseWorks && (
        <div>
          <Label className={labelCls}>Spouse&apos;s annual income</Label>
          <Chips
            items={SPOUSE_CHIPS}
            current={data.spouseIncome}
            onSelect={(v) => onChange({ spouseIncome: v })}
          />
          <div className="relative">
            <span className="absolute left-0 bottom-2 text-sm text-zinc-400">Rs</span>
            <Input
              type="number"
              placeholder="Or type exact"
              value={data.spouseIncome || ""}
              onChange={(e) => onChange({ spouseIncome: parseInt(e.target.value) || 0 })}
              className={inputCls + " pl-10"}
            />
          </div>
        </div>
      )}

      {/* Summary */}
      {data.annualIncome > 0 && (
        <Card className="rounded-lg ring-0 shadow-[0_8px_24px_rgba(0,0,0,0.04)] gap-0 py-0">
          <CardContent className="p-5 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400 mb-1">
                Gross/mo
              </p>
              <p className="text-base font-extrabold tabular-nums text-zinc-900">
                {formatInrFull(
                  Math.round(
                    (data.annualIncome + (data.spouseWorks ? data.spouseIncome : 0)) / 12
                  )
                )}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400 mb-1">
                Tax/mo
              </p>
              <p className="text-base font-extrabold tabular-nums text-red-500">
                -{formatInrFull(Math.round((annualTax + spouseTax) / 12))}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400 mb-1">
                In-hand
              </p>
              <p className="text-base font-extrabold tabular-nums text-zinc-900">
                {formatInrFull(Math.round(totalMonthlyPostTax))}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
