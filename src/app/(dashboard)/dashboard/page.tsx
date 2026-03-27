"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalLicenses: number;
  activeLicenses: number;
  expiredLicenses: number;
  recentLicenses: { id: number; key: string; domain: string; status: string; plan: string; expiresAt: string }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-fade-in pt-8 lg:pt-0">
        <div className="h-8 w-48 rounded-lg bg-white/[0.06] animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="glass-card h-32 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Total Licenses", value: data?.totalLicenses ?? 0, color: "from-blue-500/20 to-blue-600/10", iconColor: "text-blue-400",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg> },
    { label: "Active", value: data?.activeLicenses ?? 0, color: "from-emerald-500/20 to-emerald-600/10", iconColor: "text-emerald-400",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { label: "Expired", value: data?.expiredLicenses ?? 0, color: "from-red-500/20 to-red-600/10", iconColor: "text-red-400",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg> },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-white/40">License management overview</p>
        </div>
        <Link href="/licenses/create" className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          New License
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {cards.map((c, i) => (
          <div key={i} className="glass-card p-6 hover:border-white/[0.12] transition-all duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/30">{c.label}</p>
                <p className="mt-3 font-display text-3xl font-bold text-white">{c.value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${c.color}`}>
                <span className={c.iconColor}>{c.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card">
        <div className="border-b border-white/[0.05] px-6 py-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-white">Recent Licenses</h2>
          <Link href="/licenses" className="text-xs text-[#5f83f4] hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.05]">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Key</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Domain</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Status</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Plan</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Expires</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentLicenses && data.recentLicenses.length > 0 ? data.recentLicenses.map((l) => (
                <tr key={l.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4"><code className="font-mono text-xs text-[#5f83f4]">{l.key}</code></td>
                  <td className="px-6 py-4 text-sm text-white/60">{l.domain}</td>
                  <td className="px-6 py-4"><span className={`badge-${l.status}`}><span className={`h-1.5 w-1.5 rounded-full ${l.status === "active" ? "bg-emerald-400" : l.status === "expired" ? "bg-red-400" : "bg-amber-400"}`} />{l.status}</span></td>
                  <td className="px-6 py-4"><span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-white/50 uppercase">{l.plan}</span></td>
                  <td className="px-6 py-4 text-sm text-white/40">{new Date(l.expiresAt).toLocaleDateString()}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-white/30">No licenses yet. Create your first one!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
