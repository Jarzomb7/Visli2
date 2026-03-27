"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateLicensePage() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [plan, setPlan] = useState<"basic" | "pro">("basic");
  const [duration, setDuration] = useState<"1m" | "3m" | "6m" | "12m">("1m");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ key: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, plan, duration }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); return; }
      setCreated({ key: data.license.key });
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  if (created) {
    return (
      <div className="animate-fade-in flex items-center justify-center min-h-[60vh]">
        <div className="glass-card w-full max-w-md p-8 text-center">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
            <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="font-display text-xl font-bold text-white">License Created!</h2>
          <div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
            <code className="font-mono text-sm text-[#5f83f4] break-all select-all">{created.key}</code>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={() => navigator.clipboard.writeText(created.key)} className="btn-ghost flex-1">Copy</button>
            <Link href="/licenses" className="btn-primary flex-1 text-center">View All</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0">
        <Link href="/licenses" className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          Back
        </Link>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Create License</h1>
      </div>

      <div className="glass-card w-full max-w-lg p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/30">Domain *</label>
            <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} className="glass-input" placeholder="example.com" required />
          </div>

          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-white/30">Plan *</label>
            <div className="grid grid-cols-2 gap-3">
              {(["basic", "pro"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPlan(p)}
                  className={`rounded-xl border p-4 text-left transition-all ${plan === p ? "border-[#3b5eee]/50 bg-[#3b5eee]/10" : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"}`}>
                  <p className={`text-sm font-semibold uppercase ${plan === p ? "text-[#5f83f4]" : "text-white/50"}`}>{p}</p>
                  <p className="mt-0.5 text-[11px] text-white/25">{p === "basic" ? "Core features" : "All features"}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-white/30">Duration *</label>
            <div className="grid grid-cols-4 gap-2">
              {(["1m", "3m", "6m", "12m"] as const).map((d) => (
                <button key={d} type="button" onClick={() => setDuration(d)}
                  className={`rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition-all ${
                    duration === d ? "border-[#3b5eee]/50 bg-[#3b5eee]/10 text-[#5f83f4]" : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/[0.12]"
                  }`}>
                  {d === "12m" ? "1 Yr" : d.replace("m", " Mo")}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> : "Generate License"}
          </button>
        </form>
      </div>
    </div>
  );
}
