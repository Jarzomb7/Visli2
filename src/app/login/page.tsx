"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      const dest = data.user?.role === "admin" ? "/dashboard" : "/client/dashboard";
      router.push(dest);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#060d2b]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#3b5eee]/[0.08] rounded-full blur-[150px]" />
      </div>

      <div className="w-full max-w-[400px] animate-fade-in">
        <div className="mb-10 text-center">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3b5eee] to-[#1e3fdb] shadow-lg shadow-blue-500/25">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-white/35">Sign in to VISLI License Server</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/30">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="glass-input" placeholder="admin@visli.io" required />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/30">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="glass-input" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
              ) : "Sign In"}
            </button>
            <div className="text-right">
              <Link href="/forgot-password" className="text-xs text-white/30 hover:text-[#5f83f4] transition-colors">Forgot password?</Link>
            </div>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-white/30">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#5f83f4] hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
