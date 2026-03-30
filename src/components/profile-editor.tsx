"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { calculateTax, formatInrFull } from "@/lib/financial-engine";
import type { AppState } from "@/lib/store";

interface ProfileEditorProps {
  state: AppState;
  onSave: (state: AppState) => void;
  onCancel: () => void;
}

// ─── Shared styles ───────────────────────────────────────────
const sectionCls = "py-6";
const sectionTitle = "text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4";
const labelCls = "text-[11px] font-medium text-zinc-500 mb-1.5 block";
const inputCls = "h-10 text-sm tabular-nums bg-white border-zinc-200 rounded-sm";

function displayInr(val: number): string {
  if (!val) return "";
  return val.toLocaleString("en-IN");
}
function parseInr(str: string): number {
  return parseInt(str.replace(/,/g, ""), 10) || 0;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
        checked ? "bg-zinc-900" : "bg-zinc-200"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

function ChipGroup({
  items,
  current,
  onSelect,
}: {
  items: { label: string; value: string | number }[];
  current: string | number;
  onSelect: (v: never) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((b) => (
        <button
          key={String(b.value)}
          type="button"
          onClick={() => onSelect(b.value as never)}
          className={`px-3 py-1.5 text-[11px] font-bold rounded-sm transition-colors ${
            current === b.value
              ? "bg-zinc-900 text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}

const CITY_OPTIONS = [
  { label: "Metro", value: "metro" },
  { label: "Tier 1", value: "tier1" },
  { label: "Tier 2", value: "tier2" },
];

const MARITAL_OPTIONS = [
  { label: "Single", value: "single" },
  { label: "Married", value: "married" },
  { label: "Planning", value: "planning_marriage" },
];

export default function ProfileEditor({ state, onSave, onCancel }: ProfileEditorProps) {
  // ─── Local editable state ──────────────────────────────────
  const [name, setName] = useState(state.profile.name);
  const [age, setAge] = useState(state.profile.age);
  const [cityTier, setCityTier] = useState(state.profile.cityTier);
  const [annualIncome, setAnnualIncome] = useState(state.profile.annualIncome);
  const [spouseIncome, setSpouseIncome] = useState(state.profile.spouseIncome);
  const [taxRegime, setTaxRegime] = useState(state.profile.taxRegime);
  const [monthlyExpenses, setMonthlyExpenses] = useState(state.profile.monthlyExpenses);
  const [existingEmis, setExistingEmis] = useState(state.profile.existingEmis);
  const [lifestyleMonthly, setLifestyleMonthly] = useState(state.lifestyleMonthly);

  const [maritalStatus, setMaritalStatus] = useState(state.maritalStatus);
  const [parentsAtHome, setParentsAtHome] = useState(state.parentsAtHome);
  const [parentsSeparateSupport, setParentsSeparateSupport] = useState(state.parentsSeparateSupport);
  const [parentsMonthlySupportAmount, setParentsMonthlySupportAmount] = useState(state.parentsMonthlySupportAmount);
  const [inLawsDependent, setInLawsDependent] = useState(state.inLawsDependent);
  const [numberOfKids, setNumberOfKids] = useState(state.numberOfKids);
  const [kidsAges, setKidsAges] = useState(state.kidsAges);
  const [planningMoreKids, setPlanningMoreKids] = useState(state.planningMoreKids);
  const [nextKidInYears, setNextKidInYears] = useState(state.nextKidInYears);

  const [liquidSavings, setLiquidSavings] = useState(state.liquidSavings);
  const [longTermPortfolio, setLongTermPortfolio] = useState(state.longTermPortfolio);
  const [redeemablePortfolioPercent, setRedeemablePortfolioPercent] = useState(state.redeemablePortfolioPercent);
  const [existingInvestmentMonthly, setExistingInvestmentMonthly] = useState(state.existingInvestmentMonthly);
  const [parentsHealthInsurance, setParentsHealthInsurance] = useState(state.parentsHealthInsurance);
  const [parentsHealthPremium, setParentsHealthPremium] = useState(state.parentsHealthPremium);

  const [retirementAge, setRetirementAge] = useState(state.retirementAge);

  // ─── Derived ───────────────────────────────────────────────
  const annualTax = annualIncome > 0 ? calculateTax(annualIncome, taxRegime) : 0;
  const spouseTax = spouseIncome > 0 ? calculateTax(spouseIncome, taxRegime) : 0;
  const inHandMonthly = Math.round(((annualIncome + spouseIncome) - annualTax - spouseTax) / 12);

  const totalExpenses = monthlyExpenses + lifestyleMonthly +
    (parentsAtHome ? 15000 : 0) +
    (parentsSeparateSupport ? (parentsMonthlySupportAmount || 20000) : 0) +
    (inLawsDependent ? 12000 : 0);

  const surplus = inHandMonthly - totalExpenses - existingEmis;

  const handleSave = useCallback(() => {
    const updated: AppState = {
      ...state,
      profile: {
        name,
        age,
        annualIncome,
        monthlyExpenses,
        existingEmis,
        cityTier,
        taxRegime,
        spouseIncome,
      },
      lifestyleMonthly,
      liquidSavings,
      longTermPortfolio,
      redeemablePortfolioPercent,
      retirementAge,
      parentsAtHome,
      parentsSeparateSupport,
      parentsMonthlySupportAmount,
      inLawsDependent,
      maritalStatus,
      marriageAge: maritalStatus === "planning_marriage" ? age + 2 : null,
      numberOfKids,
      kidsAges,
      planningMoreKids,
      nextKidInYears,
      firstKidAge: numberOfKids > 0 ? age - kidsAges[0] : (planningMoreKids ? age + nextKidInYears : null),
      secondKidAge: numberOfKids > 1 ? age - kidsAges[1] : null,
      parentsHealthInsurance,
      parentsHealthPremium,
      existingInvestmentMonthly,
    };
    onSave(updated);
  }, [
    state, name, age, annualIncome, monthlyExpenses, existingEmis, cityTier,
    taxRegime, spouseIncome, lifestyleMonthly, liquidSavings, longTermPortfolio,
    redeemablePortfolioPercent, retirementAge, parentsAtHome, parentsSeparateSupport,
    parentsMonthlySupportAmount, inLawsDependent, maritalStatus, numberOfKids,
    kidsAges, planningMoreKids, nextKidInYears, parentsHealthInsurance,
    parentsHealthPremium, existingInvestmentMonthly, onSave,
  ]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Edit profile</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Update your numbers. Dashboard recalculates instantly.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-zinc-400 hover:text-zinc-700">
          Cancel
        </Button>
      </div>

      {/* ── 1. Basics ──────────────────────────────────────────── */}
      <div className={sectionCls}>
        <p className={sectionTitle}>Basics</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className={labelCls}>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <Label className={labelCls}>Age</Label>
            <Input
              type="number" min={18} max={65}
              value={age || ""}
              onChange={(e) => setAge(parseInt(e.target.value) || 0)}
              className={inputCls}
            />
          </div>
          <div>
            <Label className={labelCls}>City</Label>
            <ChipGroup
              items={CITY_OPTIONS}
              current={cityTier}
              onSelect={(v) => setCityTier(v as "metro" | "tier1" | "tier2")}
            />
          </div>
        </div>
      </div>

      <Separator className="bg-zinc-100" />

      {/* ── 2. Income ──────────────────────────────────────────── */}
      <div className={sectionCls}>
        <p className={sectionTitle}>Income</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label className={labelCls}>Annual income (CTC)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400">Rs</span>
              <Input
                value={displayInr(annualIncome)}
                onChange={(e) => setAnnualIncome(parseInr(e.target.value))}
                className={`${inputCls} pl-8`}
              />
            </div>
          </div>
          <div>
            <Label className={labelCls}>Spouse income (annual)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400">Rs</span>
              <Input
                value={displayInr(spouseIncome)}
                onChange={(e) => setSpouseIncome(parseInr(e.target.value))}
                className={`${inputCls} pl-8`}
                placeholder="0 if not working"
              />
            </div>
          </div>
        </div>
        <div className="mb-4">
          <Label className={labelCls}>Tax regime</Label>
          <ChipGroup
            items={[{ label: "New", value: "new" }, { label: "Old", value: "old" }]}
            current={taxRegime}
            onSelect={(v) => setTaxRegime(v as "old" | "new")}
          />
        </div>
        <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-sm">
          <span className="text-[11px] text-zinc-500">In-hand monthly</span>
          <span className="text-sm font-bold tabular-nums text-zinc-900">{formatInrFull(inHandMonthly)}</span>
        </div>
      </div>

      <Separator className="bg-zinc-100" />

      {/* ── 3. Expenses ────────────────────────────────────────── */}
      <div className={sectionCls}>
        <p className={sectionTitle}>Monthly expenses</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <Label className={labelCls}>Core expenses</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400">Rs</span>
              <Input
                value={displayInr(monthlyExpenses)}
                onChange={(e) => setMonthlyExpenses(parseInr(e.target.value))}
                className={`${inputCls} pl-8`}
              />
            </div>
            <p className="text-[9px] text-zinc-400 mt-1">Rent, food, utilities, transport</p>
          </div>
          <div>
            <Label className={labelCls}>Lifestyle</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400">Rs</span>
              <Input
                value={displayInr(lifestyleMonthly)}
                onChange={(e) => setLifestyleMonthly(parseInr(e.target.value))}
                className={`${inputCls} pl-8`}
              />
            </div>
            <p className="text-[9px] text-zinc-400 mt-1">Dining, shopping, subs</p>
          </div>
          <div>
            <Label className={labelCls}>EMIs</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400">Rs</span>
              <Input
                value={displayInr(existingEmis)}
                onChange={(e) => setExistingEmis(parseInr(e.target.value))}
                className={`${inputCls} pl-8`}
              />
            </div>
            <p className="text-[9px] text-zinc-400 mt-1">Car, personal loan, CC</p>
          </div>
        </div>
        <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-sm">
          <span className="text-[11px] text-zinc-500">Monthly surplus</span>
          <span className={`text-sm font-bold tabular-nums ${surplus >= 0 ? "text-zinc-900" : "text-red-600"}`}>
            {surplus >= 0 ? formatInrFull(surplus) : `-${formatInrFull(Math.abs(surplus))}`}
          </span>
        </div>
      </div>

      <Separator className="bg-zinc-100" />

      {/* ── 4. Household ───────────────────────────────────────── */}
      <div className={sectionCls}>
        <p className={sectionTitle}>Household</p>

        <div className="space-y-4">
          <div>
            <Label className={labelCls}>Marital status</Label>
            <ChipGroup
              items={MARITAL_OPTIONS}
              current={maritalStatus}
              onSelect={(v) => setMaritalStatus(v as "single" | "married" | "planning_marriage")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-zinc-600">Parents live with you</Label>
              <Toggle checked={parentsAtHome} onChange={setParentsAtHome} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-zinc-600">In-laws dependent</Label>
              <Toggle checked={inLawsDependent} onChange={setInLawsDependent} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-[11px] text-zinc-600">Support parents separately</Label>
            <Toggle checked={parentsSeparateSupport} onChange={setParentsSeparateSupport} />
          </div>
          {parentsSeparateSupport && (
            <div className="pl-4">
              <Label className={labelCls}>Monthly support amount</Label>
              <div className="relative w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400">Rs</span>
                <Input
                  value={displayInr(parentsMonthlySupportAmount)}
                  onChange={(e) => setParentsMonthlySupportAmount(parseInr(e.target.value))}
                  className={`${inputCls} pl-8`}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={labelCls}>Number of kids</Label>
              <ChipGroup
                items={[
                  { label: "0", value: 0 },
                  { label: "1", value: 1 },
                  { label: "2", value: 2 },
                  { label: "3+", value: 3 },
                ]}
                current={numberOfKids}
                onSelect={(v) => {
                  const n = v as number;
                  setNumberOfKids(n);
                  setKidsAges(prev => {
                    if (n > prev.length) return [...prev, ...Array(n - prev.length).fill(2)];
                    return prev.slice(0, n);
                  });
                }}
              />
            </div>
            {numberOfKids > 0 && (
              <div>
                <Label className={labelCls}>Kids ages</Label>
                <div className="flex gap-2">
                  {kidsAges.map((a, i) => (
                    <Input
                      key={i}
                      type="number" min={0} max={25}
                      value={a || ""}
                      onChange={(e) => {
                        const updated = [...kidsAges];
                        updated[i] = parseInt(e.target.value) || 0;
                        setKidsAges(updated);
                      }}
                      className={`${inputCls} w-16 text-center`}
                      placeholder={`Kid ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-[11px] text-zinc-600">Planning more kids</Label>
            <Toggle checked={planningMoreKids} onChange={setPlanningMoreKids} />
          </div>
          {planningMoreKids && (
            <div className="pl-4">
              <Label className={labelCls}>Expected in how many years?</Label>
              <Input
                type="number" min={1} max={10}
                value={nextKidInYears || ""}
                onChange={(e) => setNextKidInYears(parseInt(e.target.value) || 0)}
                className={`${inputCls} w-20`}
              />
            </div>
          )}
        </div>
      </div>

      <Separator className="bg-zinc-100" />

      {/* ── 5. Safety net & investments ─────────────────────────── */}
      <div className={sectionCls}>
        <p className={sectionTitle}>Safety net & investments</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label className={labelCls}>Liquid savings (FD + bank)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400">Rs</span>
              <Input
                value={displayInr(liquidSavings)}
                onChange={(e) => setLiquidSavings(parseInr(e.target.value))}
                className={`${inputCls} pl-8`}
              />
            </div>
          </div>
          <div>
            <Label className={labelCls}>Long-term portfolio (MF/stocks/NPS)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400">Rs</span>
              <Input
                value={displayInr(longTermPortfolio)}
                onChange={(e) => setLongTermPortfolio(parseInr(e.target.value))}
                className={`${inputCls} pl-8`}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <Label className={labelCls}>Portfolio % for goals</Label>
              <span className="text-sm font-bold tabular-nums text-zinc-900">{redeemablePortfolioPercent}%</span>
            </div>
            <Slider
              value={[redeemablePortfolioPercent]}
              onValueChange={(v) => setRedeemablePortfolioPercent(Array.isArray(v) ? v[0] : v)}
              min={0}
              max={50}
              step={5}
            />
            <div className="flex justify-between text-[9px] text-zinc-300 mt-1">
              <span>0%</span><span>25%</span><span>50%</span>
            </div>
          </div>
          <div>
            <Label className={labelCls}>Existing SIPs (monthly)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400">Rs</span>
              <Input
                value={displayInr(existingInvestmentMonthly)}
                onChange={(e) => setExistingInvestmentMonthly(parseInr(e.target.value))}
                className={`${inputCls} pl-8`}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] text-zinc-600">Parents health insurance</Label>
            <Toggle checked={parentsHealthInsurance} onChange={setParentsHealthInsurance} />
          </div>
          {parentsHealthInsurance && (
            <div>
              <Label className={labelCls}>Annual premium</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400">Rs</span>
                <Input
                  value={displayInr(parentsHealthPremium)}
                  onChange={(e) => setParentsHealthPremium(parseInr(e.target.value))}
                  className={`${inputCls} pl-8`}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator className="bg-zinc-100" />

      {/* ── 6. Retirement ──────────────────────────────────────── */}
      <div className={sectionCls}>
        <p className={sectionTitle}>Retirement</p>
        <div className="flex items-baseline justify-between mb-2">
          <Label className={labelCls}>Target retirement age</Label>
          <span className="text-lg font-extrabold tabular-nums text-zinc-900">{retirementAge}</span>
        </div>
        <Slider
          value={[retirementAge]}
          onValueChange={(v) => setRetirementAge(Array.isArray(v) ? v[0] : v)}
          min={Math.max(age + 5, 40)}
          max={70}
          step={1}
        />
        <div className="flex justify-between text-[9px] text-zinc-300 mt-1">
          <span>{Math.max(age + 5, 40)}</span><span>55</span><span>60</span><span>70</span>
        </div>
        <p className="text-[10px] text-zinc-400 mt-2">{retirementAge - age} years to go</p>
      </div>

      {/* ── Save bar ───────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-zinc-200/60 z-50">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="text-[11px] text-zinc-400">
            In-hand {formatInrFull(inHandMonthly)} · Expenses {formatInrFull(totalExpenses + existingEmis)} · Surplus{" "}
            <span className={surplus >= 0 ? "text-zinc-700 font-bold" : "text-red-600 font-bold"}>
              {surplus >= 0 ? formatInrFull(surplus) : `-${formatInrFull(Math.abs(surplus))}`}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} className="rounded-sm">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="rounded-sm">
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
