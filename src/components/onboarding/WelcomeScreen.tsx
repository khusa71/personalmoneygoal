"use client";

import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeScreenProps {
  onStart: () => void;
}

const STEP_NAMES = ["Basics", "Income", "Expenses", "Household", "Safety Net", "Freedom"];

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <>
      <style>{`
        @keyframes wsSlideFade {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes wsFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes wsBarFill {
          from { width: 0; }
          to   { width: var(--target-w); }
        }

        .ws-su  { animation: wsSlideFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .ws-fi  { animation: wsFadeIn 0.5s ease both; }
        .ws-d1  { animation-delay: 0.06s; }
        .ws-d2  { animation-delay: 0.14s; }
        .ws-d3  { animation-delay: 0.24s; }
        .ws-d4  { animation-delay: 0.34s; }
        .ws-d5  { animation-delay: 0.44s; }
        .ws-d6  { animation-delay: 0.54s; }
        .ws-d7  { animation-delay: 0.64s; }
        .ws-d8  { animation-delay: 0.74s; }
        .ws-d9  { animation-delay: 0.84s; }

        .ws-cta {
          position: relative;
          overflow: hidden;
          transition: background 0.15s ease, transform 0.1s ease;
        }
        .ws-cta::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 55%);
          pointer-events: none;
        }
        .ws-cta:hover  { background: #09090b !important; }
        .ws-cta:active { transform: scale(0.985); }

        .ws-bar-d1 { animation: wsBarFill 1s cubic-bezier(0.16,1,0.3,1) 0.85s both; }
        .ws-bar-d2 { animation: wsBarFill 1s cubic-bezier(0.16,1,0.3,1) 1.00s both; }
        .ws-bar-d3 { animation: wsBarFill 1s cubic-bezier(0.16,1,0.3,1) 1.15s both; }

        .ws-preview-card {
          background: white;
          border: 1px solid #e4e4e7;
          border-radius: 8px;
          box-shadow: 0 20px 56px rgba(0,0,0,0.08), 0 4px 14px rgba(0,0,0,0.04);
          overflow: hidden;
        }

        .ws-divider {
          height: 1px;
          background: #f0f0ee;
        }
      `}</style>

      <div
        className="h-screen flex flex-col text-zinc-900 overflow-hidden select-none"
        style={{
          backgroundColor: "#F8F8F6",
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.032) 1px, transparent 1px)
          `,
          backgroundSize: "36px 36px",
        }}
      >
        {/* Nav */}
        <nav className="ws-fi shrink-0 h-[52px] bg-white/75 backdrop-blur-md border-b border-zinc-200/50 flex items-center justify-between px-4 sm:px-10">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 bg-zinc-900 flex items-center justify-center rounded-[3px] shrink-0"
              style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}
            >
              <span className="text-white text-[9px] font-black tracking-tight leading-none">FG</span>
            </div>
            <span className="text-[14px] font-black tracking-[-0.04em] text-zinc-900">Personal Money Goal</span>
          </div>
          <span className="text-[10px] font-bold tabular-nums text-zinc-400 tracking-[0.14em] uppercase">
            01 / 06
          </span>
        </nav>

        {/* Main two-column */}
        <main className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] max-w-[1100px] mx-auto w-full px-6 sm:px-10 gap-16 items-center py-8 lg:py-0">

          {/* LEFT — editorial hero */}
          <div className="relative">
            {/* Ghost type */}
            <div
              className="absolute -top-6 -left-3 font-black leading-none pointer-events-none select-none text-zinc-900"
              style={{ fontSize: "clamp(100px, 15vw, 170px)", opacity: 0.025, letterSpacing: "-0.06em" }}
              aria-hidden
            >
              FG
            </div>

            {/* Section rule */}
            <div className="ws-su ws-fi flex items-center gap-3 mb-8 relative">
              <div className="h-px w-8 bg-zinc-300" />
              <span className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400">
                Personal Finance
              </span>
              <div className="h-px flex-1 bg-zinc-200" />
            </div>

            {/* Headline */}
            <h1
              className="ws-su ws-d1 font-black tracking-[-0.048em] leading-[0.9] text-zinc-900 mb-6 relative"
              style={{ fontSize: "clamp(2.5rem, 4vw, 3.6rem)" }}
            >
              Your financial<br />
              freedom,<br />
              <em className="not-italic text-zinc-300">engineered.</em>
            </h1>

            {/* Accent rule */}
            <div className="ws-su ws-d2 w-8 h-[3px] bg-zinc-900 mb-5 rounded-full" />

            {/* Sub */}
            <p className="ws-su ws-d2 text-[14px] text-zinc-500 leading-[1.7] font-medium mb-8 max-w-[290px]">
              Answer precise questions about your money. Get a plan built around your actual
              life&nbsp;&mdash; income, dependents, goals, and freedom.
            </p>

            {/* CTA */}
            <Button
              onClick={onStart}
              className="ws-su ws-d3 ws-cta w-full py-[14px] h-auto rounded-[3px] text-[10.5px] font-black uppercase tracking-[0.2em] mb-4"
            >
              Build my plan
            </Button>

            {/* Meta row */}
            <div className="ws-su ws-d3 flex items-center gap-4 mb-10">
              <div className="flex items-center gap-2 text-zinc-400">
                <Clock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                <span className="text-[9.5px] font-bold uppercase tracking-[0.14em]">5 minutes</span>
              </div>
              <div className="h-3 w-px bg-zinc-200" />
              <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                Free forever
              </span>
              <div className="h-3 w-px bg-zinc-200" />
              <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                Indian salaries
              </span>
            </div>

            {/* Step strip */}
            <div className="ws-su ws-d4 flex items-center gap-0.5 flex-wrap">
              {STEP_NAMES.map((name, i) => (
                <div key={name} className="flex items-center gap-1">
                  <div className="w-[5px] h-[5px] rounded-full bg-zinc-300 shrink-0" />
                  <span className="text-[8.5px] font-bold text-zinc-400 uppercase tracking-[0.1em] whitespace-nowrap">
                    {name}
                  </span>
                  {i < STEP_NAMES.length - 1 && (
                    <div className="w-3 h-px bg-zinc-200 mx-1" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — preview pane (hidden on mobile) */}
          <div className="ws-su ws-d3 hidden lg:block">
            {/* Label */}
            <div className="ws-fi ws-d2 flex items-center gap-3 mb-3">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 shrink-0">
                Sample output
              </span>
              <div className="h-px flex-1 bg-zinc-200" />
              <span className="text-[9px] text-zinc-300">yours will differ</span>
            </div>

            <div className="ws-preview-card">
              {/* Card header */}
              <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/80 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
                  Financial Snapshot
                </span>
                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                  24L CTC &middot; Metro
                </span>
              </div>

              {/* Monthly flow */}
              <div className="px-5 py-4 border-b border-zinc-100">
                <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                  {[
                    { label: "Gross monthly",   value: "1,85,000",  accent: "" },
                    { label: "Tax deducted",     value: "\u22127,500",  accent: "text-red-500" },
                    { label: "In-hand",          value: "1,57,500",  accent: "" },
                    { label: "Monthly expenses", value: "\u221282,000", accent: "text-zinc-400" },
                  ].map(({ label, value, accent }) => (
                    <div key={label}>
                      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400 mb-0.5 leading-tight">
                        {label}
                      </p>
                      <p className={`text-[15px] font-bold tabular-nums leading-snug text-zinc-900 ${accent}`}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Surplus */}
                <div className="mt-3 pt-3 border-t border-zinc-100 flex items-baseline justify-between">
                  <span className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-400">
                    Investable surplus
                  </span>
                  <div className="tabular-nums leading-none">
                    <span className="text-[24px] font-extrabold tracking-tight text-zinc-900">75,500</span>
                    <span className="text-[12px] font-bold text-zinc-400 ml-1">/mo</span>
                  </div>
                </div>
              </div>

              {/* Freedom triple stat */}
              <div className="grid grid-cols-3 divide-x divide-zinc-100 border-b border-zinc-100">
                {[
                  { label: "Freedom age",  big: "52",   small: "20 yrs away" },
                  { label: "Corpus",       big: "2.8",  small: "Cr needed",    mono: true },
                  { label: "SIP / month",  big: "28K",  small: "38% of surplus" },
                ].map(({ label, big, small, mono }) => (
                  <div key={label} className="px-4 py-3.5 text-center">
                    <p className="text-[8.5px] font-black uppercase tracking-[0.1em] text-zinc-400 mb-1">
                      {label}
                    </p>
                    <p className={`text-[26px] font-extrabold tabular-nums leading-none text-zinc-900 ${mono ? "tracking-tight" : ""}`}>
                      {big}
                      {mono && <span className="text-[14px] font-black text-zinc-400 ml-0.5">Cr</span>}
                    </p>
                    <p className="text-[9px] text-zinc-400 mt-1">{small}</p>
                  </div>
                ))}
              </div>

              {/* Goals */}
              <div className="px-5 py-4">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-400 mb-3">
                  Goals on track
                </p>
                {[
                  { name: "Home down payment", pct: 78, barClass: "ws-bar-d1" },
                  { name: "Emergency fund",    pct: 62, barClass: "ws-bar-d2" },
                  { name: "Retirement corpus", pct: 41, barClass: "ws-bar-d3" },
                ].map(({ name, pct, barClass }) => (
                  <div key={name} className="mb-2.5 last:mb-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-[11px] font-semibold text-zinc-700 leading-none">{name}</span>
                      <span className="text-[10.5px] font-bold tabular-nums text-zinc-500">{pct}%</span>
                    </div>
                    <div className="h-[3px] bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-zinc-700 ${barClass}`}
                        style={{ "--target-w": `${pct}%` } as React.CSSProperties}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy */}
            <p className="ws-fi ws-d9 text-[9px] text-zinc-400 text-center uppercase tracking-[0.12em] mt-3">
              Saved securely to your account &middot; Not financial advice
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
