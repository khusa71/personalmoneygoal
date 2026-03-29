import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col text-zinc-900"
      style={{
        backgroundColor: "#FAFAFA",
        backgroundImage: "radial-gradient(#e4e4e7 0.5px, transparent 0.5px)",
        backgroundSize: "28px 28px",
      }}
    >
      {/* Nav */}
      <nav className="shrink-0 bg-white/80 backdrop-blur-md border-b border-zinc-200/40 px-6 h-14 flex items-center justify-between">
        <span className="text-[15px] font-black tracking-[-0.04em] text-zinc-900">
          FinGoal
        </span>
        <div className="flex items-center gap-2">
          <Link href="/auth/login">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-zinc-600 hover:text-zinc-900"
            >
              Sign in
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button
              size="sm"
              className="h-8 px-4 text-[10.5px] font-bold uppercase tracking-[0.1em] bg-zinc-900 text-white hover:bg-zinc-800 rounded-[2px]"
            >
              Get started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-xl text-center space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-black tracking-[-0.04em] text-zinc-900 leading-tight">
              Will your life math work?
            </h1>
            <p className="text-[15px] text-zinc-500 leading-relaxed max-w-md mx-auto">
              Plan your wedding, house, kids&apos; education, and retirement — all
              on one salary. See if the numbers add up and get your exact monthly
              money moves.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="h-11 px-8 text-[11px] font-bold uppercase tracking-[0.12em] bg-zinc-900 text-white hover:bg-zinc-800 rounded-[2px]"
              >
                Start planning — it&apos;s free
              </Button>
            </Link>
          </div>

          {/* Value props */}
          <div className="grid sm:grid-cols-3 gap-6 pt-4">
            {[
              {
                title: "Goal-by-goal SIPs",
                desc: "Exact monthly amounts for each goal, with step-up SIPs that grow with your salary.",
              },
              {
                title: "Feasibility verdict",
                desc: "Instantly see if your income can cover all goals — or what needs to give.",
              },
              {
                title: "What-if scenarios",
                desc: "Spouse income, extra kids, early retirement — test every life change in seconds.",
              },
            ].map((item) => (
              <div key={item.title} className="text-left space-y-1.5">
                <h3 className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-zinc-900">
                  {item.title}
                </h3>
                <p className="text-[12px] text-zinc-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-zinc-400 uppercase tracking-[0.15em] font-medium pt-2">
            Free forever. No credit card. Built for Indian salaries.
          </p>
        </div>
      </main>
    </div>
  );
}
