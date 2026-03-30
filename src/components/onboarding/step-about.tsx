"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OnboardingData } from "./types";

interface Props {
  data: OnboardingData;
  onChange: (data: Partial<OnboardingData>) => void;
}

const CITIES = [
  { value: "metro" as const, label: "Metro", desc: "Mumbai, Delhi, Bangalore, Hyderabad" },
  { value: "tier1" as const, label: "Tier 1", desc: "Jaipur, Lucknow, Kochi, Ahmedabad" },
  { value: "tier2" as const, label: "Tier 2", desc: "Indore, Bhopal, Coimbatore, Mysuru" },
];

const inputCls =
  "h-auto bg-transparent border-0 border-b-2 border-zinc-200 rounded-none " +
  "focus-visible:border-zinc-900 focus-visible:ring-0 focus-visible:ring-offset-0 " +
  "px-0 py-2 text-2xl font-bold tabular-nums transition-colors " +
  "placeholder:text-zinc-300 placeholder:text-base placeholder:font-normal text-zinc-900 " +
  "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const labelCls = "text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-3 block";

export default function StepAbout({ data, onChange }: Props) {
  return (
    <div className="space-y-8">
      {/* Name + Age */}
      <div className="grid grid-cols-2 gap-4 sm:gap-8">
        <div>
          <Label className={labelCls}>Name</Label>
          <Input
            type="text"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="First name"
            autoFocus
            className={inputCls}
          />
        </div>
        <div>
          <Label className={labelCls}>Age</Label>
          <Input
            type="number"
            min={18}
            max={65}
            value={data.age || ""}
            onChange={(e) => onChange({ age: parseInt(e.target.value) || 0 })}
            placeholder="28"
            className={inputCls}
          />
        </div>
      </div>

      {/* City tier */}
      <div>
        <Label className={labelCls}>Where do you live?</Label>
        <div className="grid grid-cols-3 gap-3">
          {CITIES.map((city) => (
            <Button
              key={city.value}
              variant={data.cityTier === city.value ? "default" : "outline"}
              onClick={() => onChange({ cityTier: city.value })}
              className="h-auto flex flex-col items-start justify-start p-4 text-left whitespace-normal"
            >
              <span className="font-bold text-base leading-tight block">{city.label}</span>
              <span
                className={`text-[11px] leading-tight font-normal mt-1 block ${
                  data.cityTier === city.value ? "text-zinc-300" : "text-zinc-400"
                }`}
              >
                {city.desc}
              </span>
            </Button>
          ))}
        </div>
        <p className="text-xs text-zinc-400 mt-3">
          Metro cities cost ~2x tier 2. This adjusts all estimates.
        </p>
      </div>
    </div>
  );
}
