"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-[15px] font-black tracking-[-0.04em] text-zinc-900">
          FinGoal
        </h1>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-zinc-400">
          Sign in to your account
        </p>
      </div>

      <Card className="border-zinc-200/60 shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full h-9 text-[11px] font-bold uppercase tracking-[0.08em] border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:text-zinc-900"
            onClick={handleGoogleLogin}
          >
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-200" />
            </div>
            <div className="relative flex justify-center text-[9px] uppercase tracking-[0.15em]">
              <span className="bg-card px-2 text-zinc-400">or</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500">
                Email
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9 text-[13px] border-zinc-200 focus:border-zinc-400"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500">
                Password
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-9 text-[13px] border-zinc-200 focus:border-zinc-400"
                placeholder="Min 6 characters"
              />
            </div>

            {error && (
              <p className="text-[11px] text-red-500 font-medium">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-9 text-[10.5px] font-bold uppercase tracking-[0.1em] bg-zinc-900 text-white hover:bg-zinc-800"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-[11px] text-zinc-400">
        No account?{" "}
        <Link
          href="/auth/signup"
          className="font-semibold text-zinc-700 hover:text-zinc-900 underline underline-offset-2"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
