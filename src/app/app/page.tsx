"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Onboarding from "@/components/onboarding/index";
import GoalPlanner from "@/components/goal-planner/index";
import Dashboard from "@/components/dashboard";
import ProfileEditor from "@/components/profile-editor";
import { DEFAULT_STATE } from "@/lib/store";
import type { AppState } from "@/lib/store";
import type { Goal } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useAppState } from "@/lib/use-app-state";

export default function AppPage() {
  const router = useRouter();
  const {
    state,
    loaded,
    updateState,
    addGoal,
    updateGoal,
    removeGoal,
    reorderGoals,
    resetAll,
  } = useAppState();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [editingProfile, setEditingProfile] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!loaded) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{
          backgroundColor: "#FAFAFA",
          backgroundImage: "radial-gradient(#e4e4e7 0.5px, transparent 0.5px)",
          backgroundSize: "28px 28px",
        }}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Loading...</span>
      </div>
    );
  }

  if (!state.onboarded) {
    return <Onboarding state={state} onComplete={updateState} />;
  }

  return (
    <div
      className="h-screen flex flex-col text-zinc-900"
      style={{
        backgroundColor: "#FAFAFA",
        backgroundImage: "radial-gradient(#e4e4e7 0.5px, transparent 0.5px)",
        backgroundSize: "28px 28px",
      }}
    >
      {/* Nav */}
      <nav className="shrink-0 bg-white/80 backdrop-blur-md border-b border-zinc-200/40 px-4 sm:px-6">
        {/* Top row */}
        <div className="h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-6">
            <span className="text-[15px] font-black tracking-[-0.04em] text-zinc-900 shrink-0">FinGoal</span>

            {/* Tabs — desktop only in top row */}
            <div className="hidden sm:block">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(String(v))}>
                <TabsList className="h-8 bg-zinc-100/70 p-0.5 gap-0.5">
                  <TabsTrigger
                    value="dashboard"
                    className="h-7 px-3.5 text-[10.5px] font-bold uppercase tracking-[0.1em] data-active:bg-zinc-900 data-active:text-white data-active:shadow-none rounded-[2px]"
                  >
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger
                    value="goals"
                    className="h-7 px-3.5 text-[10.5px] font-bold uppercase tracking-[0.1em] data-active:bg-zinc-900 data-active:text-white data-active:shadow-none rounded-[2px]"
                  >
                    Goals ({state.goals.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[11px] text-zinc-400 font-medium hidden lg:block tabular-nums">
              {state.profile.name && `${state.profile.name} · `}
              {state.profile.age}yr · ₹{(state.profile.annualIncome / 100000).toFixed(0)}L · Retire {state.retirementAge}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingProfile(true)}
              className="h-7 px-2 sm:px-3 text-[10.5px] font-bold uppercase tracking-[0.1em] border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 rounded-[2px]"
            >
              <span className="hidden sm:inline">Edit Profile</span>
              <span className="sm:hidden">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="h-7 px-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-zinc-400 hover:text-zinc-600 hover:bg-transparent"
            >
              Sign out
            </Button>
          </div>
        </div>

        {/* Mobile tabs row */}
        <div className="sm:hidden pb-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(String(v))}>
            <TabsList className="h-8 bg-zinc-100/70 p-0.5 gap-0.5 w-full">
              <TabsTrigger
                value="dashboard"
                className="flex-1 h-7 px-3.5 text-[10.5px] font-bold uppercase tracking-[0.1em] data-active:bg-zinc-900 data-active:text-white data-active:shadow-none rounded-[2px]"
              >
                Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="goals"
                className="flex-1 h-7 px-3.5 text-[10.5px] font-bold uppercase tracking-[0.1em] data-active:bg-zinc-900 data-active:text-white data-active:shadow-none rounded-[2px]"
              >
                Goals ({state.goals.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        {editingProfile ? (
          <ProfileEditor
            state={state}
            onSave={(updated) => {
              updateState(updated);
              setEditingProfile(false);
            }}
            onCancel={() => setEditingProfile(false)}
          />
        ) : activeTab === "dashboard" ? (
          <Dashboard state={state} />
        ) : (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <GoalPlanner
              state={state}
              onAddGoal={addGoal}
              onUpdateGoal={updateGoal}
              onRemoveGoal={removeGoal}
              onReorderGoals={reorderGoals}
            />
          </div>
        )}
      </main>
    </div>
  );
}
