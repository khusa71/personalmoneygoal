"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  async function handleGoogleSignup() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  if (success) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-[15px] font-black tracking-[-0.04em] text-zinc-900">
            FinGoal
          </h1>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-zinc-400">
            Check your email
          </p>
        </div>

        <Card className="border-zinc-200/60 shadow-sm">
          <CardContent className="pt-6 space-y-3">
            <p className="text-[13px] text-zinc-600 text-center leading-relaxed">
              We sent a confirmation link to{" "}
              <span className="font-semibold text-zinc-900">{email}</span>.
              Click the link to activate your account.
            </p>
            <p className="text-[11px] text-zinc-400 text-center">
              Check your spam folder if you don&apos;t see it.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-zinc-400">
          Already confirmed?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-zinc-700 hover:text-zinc-900 underline underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-[15px] font-black tracking-[-0.04em] text-zinc-900">
          FinGoal
        </h1>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-zinc-400">
          Create your account
        </p>
      </div>

      <Card className="border-zinc-200/60 shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full h-9 text-[11px] font-bold uppercase tracking-[0.08em] border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:text-zinc-900"
            onClick={handleGoogleSignup}
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

          <form onSubmit={handleSignup} className="space-y-3">
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
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="text-[10px] text-zinc-400 text-center leading-relaxed">
            Free forever. No credit card needed.
          </p>
        </CardContent>
      </Card>

      <p className="text-center text-[11px] text-zinc-400">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-semibold text-zinc-700 hover:text-zinc-900 underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
