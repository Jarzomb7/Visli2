"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Sub { id: number; status: string; plan: string; productCode: string | null; currentPeriodEnd: string | null; product: { name: string } | null; license: { key: string; domain: string; status: string } | null; }
interface Lic { id: number; key: string; domain: string; status: string; plan: string; expiresAt: string; product: { name: string } | null; }
interface Addon { id: number; type: string; amount: number; status: string; meta: string | null; }

export default function ClientDashboard() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [licenses, setLicenses] = useState<Lic[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/dashboard")
      .then((r) => r.json())
      .then((d) => { setSubs(d.subscriptions || []); setLicenses(d.licenses || []); setAddons(d.addons || []); setEmail(d.email || ""); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="animate-fade-in pt-8 lg:pt-0">
      <div className="h-8 w-48 rounded-lg bg-white/[0.06] animate-pulse mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[1,2,3].map((i) => <div key={i} className="glass-card h-32 animate-pulse" />)}</div>
    </div>
  );

  const activeSubs = subs.filter((s) => s.status === "active").length;
  const activeLic = licenses.filter((l) => l.status === "active").length;

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Welcome back</h1>
        <p className="mt-1 text-sm text-white/40">{email}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-white/30">Active Subscriptions</p>
          <p className="mt-3 font-display text-3xl font-bold text-white">{activeSubs}</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-white/30">Active Licenses</p>
          <p className="mt-3 font-display text-3xl font-bold text-white">{activeLic}</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-white/30">Addons</p>
          <p className="mt-3 font-display text-3xl font-bold text-white">{addons.length}</p>
        </div>
      </div>

      {/* Active subscriptions */}
      <div className="glass-card mb-6">
        <div className="border-b border-white/[0.05] px-6 py-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-white">Your Subscriptions</h2>
          <Link href="/app/subscriptions" className="text-xs text-emerald-400 hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-white/[0.03]">
          {subs.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-white/30">No subscriptions yet.</p>
          ) : subs.slice(0, 3).map((s) => (
            <div key={s.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium text-white/80">{s.product?.name || s.productCode}</p>
                <p className="text-[11px] text-white/30 mt-0.5">
                  <span className="uppercase">{s.plan}</span> · Renews {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : "—"}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${s.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${s.status === "active" ? "bg-emerald-400" : "bg-red-400"}`} />{s.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Licenses */}
      <div className="glass-card">
        <div className="border-b border-white/[0.05] px-6 py-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-white">Your Licenses</h2>
          <Link href="/app/licenses" className="text-xs text-emerald-400 hover:underline">Manage</Link>
        </div>
        <div className="divide-y divide-white/[0.03]">
          {licenses.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-white/30">No licenses yet.</p>
          ) : licenses.slice(0, 3).map((l) => (
            <div key={l.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <code className="font-mono text-xs text-[#5f83f4]">{l.key}</code>
                <p className="text-[11px] text-white/30 mt-0.5">{l.domain === "PENDING" ? <span className="text-amber-400">Domain not set</span> : l.domain}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${l.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${l.status === "active" ? "bg-emerald-400" : "bg-red-400"}`} />{l.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
