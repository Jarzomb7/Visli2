"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) setDone(true);
      else setError(data.error || "Failed to reset password");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  if (!token) return (
    <div className="text-center">
      <p className="text-sm text-red-400">Invalid reset link. No token provided.</p>
      <Link href="/forgot-password" className="mt-4 inline-block text-sm text-[#5f83f4] hover:underline">Request a new link</Link>
    </div>
  );

  if (done) return (
    <div className="text-center">
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
        <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <p className="text-sm text-white/60 mb-4">Your password has been reset successfully.</p>
      <Link href="/login" className="btn-primary inline-block">Log In</Link>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-white/30 mb-2">New Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="glass-input w-full" placeholder="••••••••" />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-white/30 mb-2">Confirm Password</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="glass-input w-full" placeholder="••••••••" />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Resetting..." : "Reset Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#060d2b]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#3b5eee]/[0.06] rounded-full blur-[120px]" />
      </div>
      <div className="glass-card w-full max-w-md p-10 animate-fade-in">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-bold text-white">Reset Password</h1>
          <p className="mt-2 text-sm text-white/40">Enter your new password</p>
        </div>
        <Suspense fallback={<div className="h-32 animate-pulse bg-white/[0.04] rounded-xl" />}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
