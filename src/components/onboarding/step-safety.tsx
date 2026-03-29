"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { formatInrFull } from "@/lib/financial-engine";
import type { OnboardingData } from "./types";

interface Props {
  data: OnboardingData;
  onChange: (data: Partial<OnboardingData>) => void;
}

function Toggle({
  checked,
  onChange: onToggle,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-zinc-200 rounded-full peer peer-checked:bg-zinc-900 after:content-[''] after:absolute after:top-[3px] after:start-[3px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:after:translate-x-full" />
    </label>
  );
}

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
    <div className="flex flex-wrap gap-2 mb-2">
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

const LIQUID_CHIPS = [
  { label: "0",   value: 0 },
  { label: "50K", value: 50000 },
  { label: "1L",  value: 100000 },
  { label: "2L",  value: 200000 },
  { label: "3L",  value: 300000 },
  { label: "5L",  value: 500000 },
  { label: "10L", value: 1000000 },
  { label: "15L+", value: 1500000 },
];

const LONGTERM_CHIPS = [
  { label: "0",   value: 0 },
  { label: "1L",  value: 100000 },
  { label: "5L",  value: 500000 },
  { label: "10L", value: 1000000 },
  { label: "25L", value: 2500000 },
  { label: "50L", value: 5000000 },
  { label: "1Cr+", value: 10000000 },
];

const SIP_CHIPS = [
  { label: "0",   value: 0 },
  { label: "5K",  value: 5000 },
  { label: "10K", value: 10000 },
  { label: "20K", value: 20000 },
  { label: "30K", value: 30000 },
  { label: "50K+", value: 50000 },
];

const HEALTH_CHIPS = [
  { label: "0",   value: 0 },
  { label: "5L",  value: 5 },
  { label: "10L", value: 10 },
  { label: "15L", value: 15 },
  { label: "25L", value: 25 },
  { label: "50L", value: 50 },
];

const PREMIUM_CHIPS = [
  { label: "20K", value: 20000 },
  { label: "30K", value: 30000 },
  { label: "40K", value: 40000 },
  { label: "50K", value: 50000 },
  { label: "75K+", value: 75000 },
];

const DILUTION_OPTIONS = [
  { label: "0%",  value: 0,  desc: "Keep all invested" },
  { label: "10%", value: 10, desc: "Conservative" },
  { label: "25%", value: 25, desc: "Balanced" },
  { label: "50%", value: 50, desc: "Aggressive" },
];

const labelCls = "text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-2 block";

export default function StepSafety({ data, onChange }: Props) {
  const totalExpenses =
    data.rent + data.food + data.transport + data.utilities +
    data.lifestyle + data.maidAndHelp + data.existingEmis + data.otherExpenses;
  const dependentCost =
    (data.parentsLivingWith ? 15000 : 0) +
    (data.parentsSupportSeparately ? data.parentsMonthlySupportAmount || 20000 : 0) +
    (data.inLawsDependent ? 12000 : 0);
  const monthlyNeed = totalExpenses + dependentCost;
  const emergencyTarget = monthlyNeed * 6;

  // Liquid coverage
  const coverageMonths = monthlyNeed > 0 ? data.liquidSavings / monthlyNeed : 0;
  const coveragePercent = emergencyTarget > 0
    ? Math.min(100, Math.round((data.liquidSavings / emergencyTarget) * 100))
    : 0;
  const liquidExcess = Math.max(0, data.liquidSavings - emergencyTarget);
  const emergencyFull = data.liquidSavings >= emergencyTarget;

  // Long-term redeemable
  const redeemable = Math.round(data.longTermPortfolio * (data.redeemablePortfolioPercent / 100));
  // Compounding cost: what redeemable would grow to at 12% equity vs. staying put — over a 10-year typical horizon
  const horizonYears = 10;
  const foregoneValue = Math.round(redeemable * Math.pow(1.12, horizonYears));

  return (
    <div className="space-y-7">

      {/* ── Liquid savings ── */}
      <div>
        <Label className={labelCls}>Liquid savings</Label>
        <p className="text-[11px] text-zinc-400 mb-3">
          Bank savings account, FDs, liquid mutual funds — your accessible buffer.
          Covers your emergency fund. Excess can fund short-term goals via FD overdraft
          without breaking the deposit.
        </p>
        <Chips
          items={LIQUID_CHIPS}
          current={data.liquidSavings}
          onSelect={(v) => onChange({ liquidSavings: v })}
        />
        {monthlyNeed > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-zinc-400">
                Emergency coverage · 6 months = {formatInrFull(emergencyTarget)}
              </span>
              <span className={`text-[10px] font-bold tabular-nums ${emergencyFull ? "text-emerald-600" : "text-zinc-500"}`}>
                {coverageMonths.toFixed(1)} mo
              </span>
            </div>
            <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${emergencyFull ? "bg-emerald-500" : "bg-zinc-400"}`}
                style={{ width: `${coveragePercent}%` }}
              />
            </div>
            {emergencyFull && liquidExcess > 0 && (
              <p className="text-[10px] text-emerald-600 font-medium mt-1.5">
                Emergency buffer full &mdash; {formatInrFull(liquidExcess)} above target,
                available for short-term goals via overdraft.
              </p>
            )}
            {!emergencyFull && data.liquidSavings > 0 && (
              <p className="text-[10px] text-amber-600 mt-1.5">
                {formatInrFull(emergencyTarget - data.liquidSavings)} more to reach 6-month buffer.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Long-term portfolio ── */}
      <div>
        <Label className={labelCls}>Long-term portfolio</Label>
        <p className="text-[11px] text-zinc-400 mb-3">
          Mutual funds, stocks, bonds, PPF, NPS — meant to stay invested and compound.
          You can allocate a portion toward goals, but early redemption has a compounding cost.
        </p>
        <Chips
          items={LONGTERM_CHIPS}
          current={data.longTermPortfolio}
          onSelect={(v) => onChange({ longTermPortfolio: v })}
        />
      </div>

      {/* ── Dilution % ── */}
      {data.longTermPortfolio > 0 && (
        <div>
          <Label className={labelCls}>Allocate toward goals</Label>
          <p className="text-[11px] text-zinc-400 mb-3">
            What percentage of your long-term portfolio can be redeemed for goals?
            The rest stays invested and continues compounding.
          </p>
          <div className="flex gap-2 flex-wrap mb-3">
            {DILUTION_OPTIONS.map((opt) => {
              const isSelected = data.redeemablePortfolioPercent === opt.value;
              return (
                <Button
                  key={opt.value}
                  variant={isSelected ? "default" : "secondary"}
                  size="sm"
                  onClick={() => onChange({ redeemablePortfolioPercent: opt.value })}
                  className="font-bold"
                >
                  {opt.label}
                  <span className={`ml-1.5 text-[10px] font-normal ${isSelected ? "text-white/70" : "text-zinc-400"}`}>
                    {opt.desc}
                  </span>
                </Button>
              );
            })}
          </div>
          {redeemable > 0 && (
            <Card className="rounded-none ring-0 gap-0 py-0 border-l-4 border-amber-400 bg-amber-50/60">
              <CardContent className="p-3 space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-bold text-amber-800">
                    {formatInrFull(redeemable)} redeemable
                  </span>
                  <span className="text-[10px] text-amber-600">
                    {data.redeemablePortfolioPercent}% of {formatInrFull(data.longTermPortfolio)}
                  </span>
                </div>
                <p className="text-[10px] text-amber-700">
                  Left invested at 12% for {horizonYears} years, this becomes ~{formatInrFull(foregoneValue)}.
                  Redeeming early reduces goal SIPs but foregoes{" "}
                  <span className="font-bold">{formatInrFull(foregoneValue - redeemable)}</span> in compounding.
                </p>
                <p className="text-[10px] text-zinc-500">
                  {formatInrFull(data.longTermPortfolio - redeemable)} stays invested and keeps compounding.
                </p>
              </CardContent>
            </Card>
          )}
          {data.redeemablePortfolioPercent === 0 && (
            <p className="text-[10px] text-zinc-400 mt-1">
              Full portfolio stays invested. Goals will be funded entirely from new SIPs.
            </p>
          )}
        </div>
      )}

      {/* ── Monthly SIPs ── */}
      <div>
        <Label className={labelCls}>Monthly SIPs already running</Label>
        <Chips
          items={SIP_CHIPS}
          current={data.existingInvestmentMonthly}
          onSelect={(v) => onChange({ existingInvestmentMonthly: v })}
        />
        <p className="text-[10px] text-zinc-300 mt-1">SIPs + RDs + recurring investments</p>
      </div>

      {/* ── Health insurance ── */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <Label className={labelCls}>Health cover (lakhs)</Label>
          <Chips
            items={HEALTH_CHIPS}
            current={data.healthInsuranceCover}
            onSelect={(v) => onChange({ healthInsuranceCover: v })}
          />
          {data.healthInsuranceCover > 0 && data.healthInsuranceCover < 10 && (
            <p className="text-[10px] text-red-500 font-medium">May not be enough for metros.</p>
          )}
        </div>
        <div>
          <Label className={labelCls}>Parents insurance</Label>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600">Has cover?</span>
            <Toggle
              checked={data.parentsHealthInsurance}
              onChange={(v) => onChange({ parentsHealthInsurance: v })}
            />
          </div>
          {data.parentsHealthInsurance && (
            <Chips
              items={PREMIUM_CHIPS}
              current={data.parentsHealthPremium}
              onSelect={(v) => onChange({ parentsHealthPremium: v })}
            />
          )}
        </div>
      </div>

      {/* Warning */}
      {(data.parentsLivingWith || data.parentsSupportSeparately) &&
        !data.parentsHealthInsurance && (
          <Card className="rounded-none ring-0 gap-0 py-0 border-l-4 border-red-500 bg-red-50">
            <CardContent className="p-3 text-xs text-red-600 font-medium">
              Parents have no health cover. One emergency can wipe years of savings.
            </CardContent>
          </Card>
        )}
    </div>
  );
}
