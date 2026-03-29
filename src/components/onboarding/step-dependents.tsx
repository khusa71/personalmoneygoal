"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const inputCls =
  "h-auto bg-transparent border-0 border-b-2 border-zinc-200 rounded-none " +
  "focus-visible:border-zinc-900 focus-visible:ring-0 focus-visible:ring-offset-0 " +
  "px-0 py-1.5 text-xl font-bold tabular-nums transition-colors " +
  "placeholder:text-zinc-300 text-zinc-900 " +
  "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const labelCls = "text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-3 block";

export default function StepDependents({ data, onChange }: Props) {
  const handleKidsChange = (count: number) => {
    const ages = data.kidsAges.slice(0, count);
    while (ages.length < count) ages.push(0);
    onChange({ numberOfKids: count, kidsAges: ages });
  };

  const handleKidAge = (index: number, age: number) => {
    const ages = [...data.kidsAges];
    ages[index] = age;
    onChange({ kidsAges: ages });
  };

  let dependentCost = 0;
  if (data.parentsLivingWith) dependentCost += 15000;
  if (data.parentsSupportSeparately) dependentCost += data.parentsMonthlySupportAmount || 20000;
  if (data.inLawsDependent) dependentCost += 12000;

  return (
    <div className="space-y-6">
      {/* Marital status */}
      <div>
        <Label className={labelCls}>Status</Label>
        <div className="flex gap-2">
          {(
            [
              { value: "single", label: "Single" },
              { value: "married", label: "Married" },
              { value: "planning_marriage", label: "Planning to marry" },
            ] as const
          ).map((opt) => (
            <Button
              key={opt.value}
              variant={data.maritalStatus === opt.value ? "default" : "secondary"}
              size="sm"
              onClick={() => onChange({ maritalStatus: opt.value })}
              className="font-bold"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Parents toggle rows */}
      <div className="divide-y divide-zinc-100">
        <div className="flex items-center justify-between py-3.5">
          <div>
            <span className="text-sm font-bold text-zinc-900">Parents live with you</span>
            <span className="text-xs text-zinc-400 ml-2">+Rs 15K/mo</span>
          </div>
          <Toggle
            checked={data.parentsLivingWith}
            onChange={(v) =>
              onChange({
                parentsLivingWith: v,
                parentsSupportSeparately: v ? false : data.parentsSupportSeparately,
              })
            }
          />
        </div>

        <div className="flex items-center justify-between py-3.5">
          <span className="text-sm font-bold text-zinc-900">Support parents separately</span>
          <Toggle
            checked={data.parentsSupportSeparately}
            onChange={(v) =>
              onChange({
                parentsSupportSeparately: v,
                parentsLivingWith: v ? false : data.parentsLivingWith,
              })
            }
          />
        </div>

        {data.parentsSupportSeparately && (
          <div className="py-3 pl-4">
            <div className="relative max-w-[220px]">
              <span className="absolute left-0 bottom-2 text-xs text-zinc-400">Rs/mo</span>
              <Input
                type="number"
                placeholder="20000"
                value={data.parentsMonthlySupportAmount || ""}
                onChange={(e) =>
                  onChange({ parentsMonthlySupportAmount: parseInt(e.target.value) || 0 })
                }
                className={inputCls + " pl-14"}
              />
            </div>
          </div>
        )}

        {(data.maritalStatus === "married" || data.maritalStatus === "planning_marriage") && (
          <div className="flex items-center justify-between py-3.5">
            <div>
              <span className="text-sm font-bold text-zinc-900">In-laws dependent</span>
              <span className="text-xs text-zinc-400 ml-2">+Rs 12K/mo</span>
            </div>
            <Toggle
              checked={data.inLawsDependent}
              onChange={(v) => onChange({ inLawsDependent: v })}
            />
          </div>
        )}
      </div>

      {/* Kids */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Label className={labelCls}>Children</Label>
          <div className="flex items-center gap-3 bg-zinc-100 rounded-full px-4 py-1.5">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleKidsChange(Math.max(0, data.numberOfKids - 1))}
              className="text-zinc-600 hover:text-zinc-900 font-bold leading-none rounded-full"
            >
              &minus;
            </Button>
            <span className="text-base font-bold tabular-nums w-5 text-center text-zinc-900">
              {data.numberOfKids}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleKidsChange(Math.min(4, data.numberOfKids + 1))}
              className="text-zinc-600 hover:text-zinc-900 font-bold leading-none rounded-full"
            >
              +
            </Button>
          </div>
        </div>

        {data.numberOfKids > 0 && (
          <div className="flex gap-5 mb-4">
            {data.kidsAges.map((age, i) => (
              <div key={i} className="flex-1 max-w-[140px]">
                <label className="text-[10px] text-zinc-400 mb-1 block">Child {i + 1} age</label>
                <Input
                  type="number"
                  min={0}
                  max={25}
                  value={age || ""}
                  onChange={(e) => handleKidAge(i, parseInt(e.target.value) || 0)}
                  className={inputCls + " text-2xl"}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between py-3 border-t border-zinc-100">
          <span className="text-sm font-bold text-zinc-900">
            Planning {data.numberOfKids > 0 ? "more " : ""}kids
          </span>
          <Toggle
            checked={data.planningMoreKids}
            onChange={(v) => onChange({ planningMoreKids: v })}
          />
        </div>

        {data.planningMoreKids && (
          <div className="pl-4 py-2">
            <div className="relative max-w-[180px]">
              <span className="absolute left-0 bottom-2 text-xs text-zinc-400">In years</span>
              <Input
                type="number"
                min={1}
                max={15}
                placeholder="3"
                value={data.nextKidInYears || ""}
                onChange={(e) =>
                  onChange({ nextKidInYears: parseInt(e.target.value) || 0 })
                }
                className={inputCls + " pl-16"}
              />
            </div>
          </div>
        )}
      </div>

      {/* Dependent cost summary */}
      {dependentCost > 0 && (
        <Card className="rounded-lg ring-0 shadow-[0_8px_24px_rgba(0,0,0,0.04)] gap-0 py-0">
          <CardContent className="p-4 flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
              Dependent cost
            </span>
            <span className="text-base font-extrabold tabular-nums text-zinc-900">
              +{formatInrFull(dependentCost)}/mo
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
