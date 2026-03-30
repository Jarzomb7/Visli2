"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setSent(true);
      else setError("Something went wrong. Please try again.");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#060d2b]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#3b5eee]/[0.06] rounded-full blur-[120px]" />
      </div>
      <div className="glass-card w-full max-w-md p-10 animate-fade-in">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-bold text-white">Forgot Password</h1>
          <p className="mt-2 text-sm text-white/40">Enter your email to receive a reset link</p>
        </div>
        {sent ? (
          <div className="text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
              <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-sm text-white/60">If an account exists for <span className="text-white font-medium">{email}</span>, a reset link has been sent.</p>
            <Link href="/login" className="mt-6 inline-block text-sm text-[#5f83f4] hover:underline">Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/30 mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="glass-input w-full" placeholder="you@example.com" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <p className="text-center text-sm text-white/30">
              Remember your password? <Link href="/login" className="text-[#5f83f4] hover:underline">Log in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
