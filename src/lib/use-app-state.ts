"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DEFAULT_STATE, type AppState } from "@/lib/store";
import type { Goal } from "@/types";
import { createClient } from "@/lib/supabase/client";
import {
  fetchAppState,
  upsertProfile,
  upsertGoal,
  deleteGoal,
  replaceAllGoals,
} from "@/lib/supabase/queries";

export function useAppState() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabaseRef = useRef(createClient());

  // Load data on mount
  useEffect(() => {
    async function load() {
      const supabase = supabaseRef.current;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoaded(true);
        return;
      }

      setUserId(user.id);
      const appState = await fetchAppState(supabase, user.id);
      setState(appState);
      setLoaded(true);
    }

    load();
  }, []);

  // Debounced profile save
  const saveProfile = useCallback(
    (newState: AppState) => {
      if (!userId) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        upsertProfile(supabaseRef.current, userId, newState);
      }, 1500);
    },
    [userId],
  );

  const updateState = useCallback(
    (newState: AppState) => {
      setState(newState);
      saveProfile(newState);
    },
    [saveProfile],
  );

  const addGoal = useCallback(
    (goal: Goal) => {
      const newState = { ...state, goals: [...state.goals, goal] };
      setState(newState);
      if (userId) upsertGoal(supabaseRef.current, userId, goal);
    },
    [state, userId],
  );

  const updateGoal = useCallback(
    (updated: Goal) => {
      const newState = {
        ...state,
        goals: state.goals.map((g) => (g.id === updated.id ? updated : g)),
      };
      setState(newState);
      if (userId) upsertGoal(supabaseRef.current, userId, updated);
    },
    [state, userId],
  );

  const removeGoal = useCallback(
    (id: string) => {
      const newState = {
        ...state,
        goals: state.goals.filter((g) => g.id !== id),
      };
      setState(newState);
      if (userId) deleteGoal(supabaseRef.current, userId, id);
    },
    [state, userId],
  );

  const reorderGoals = useCallback(
    (goals: Goal[]) => {
      const newState = { ...state, goals };
      setState(newState);
      if (userId) replaceAllGoals(supabaseRef.current, userId, goals);
    },
    [state, userId],
  );

  const resetAll = useCallback(() => {
    const newState = { ...DEFAULT_STATE, onboarded: false };
    setState(newState);
    if (userId) {
      upsertProfile(supabaseRef.current, userId, newState);
      replaceAllGoals(supabaseRef.current, userId, []);
    }
  }, [userId]);

  return {
    state,
    loaded,
    updateState,
    addGoal,
    updateGoal,
    removeGoal,
    reorderGoals,
    resetAll,
  };
}
