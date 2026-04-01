"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalLicenses: number;
  activeLicenses: number;
  expiredLicenses: number;
  totalValidations: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalClients: number;
  monthlyRevenue: number;
  annualRevenue: number;
  previousMonthRevenue: number;
  renewalsRevenue: number;
  manualRevenue: number;
  recentLicenses: { id: number; key: string; domain: string; status: string; plan: string; expiresAt: string; product?: { id: number; name: string; code: string } | null }[];
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4,5,6,7,8,9].map((i) => <div key={i} className="glass-card h-32 animate-pulse" />)}
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
    { label: "Validations", value: data?.totalValidations ?? 0, color: "from-purple-500/20 to-purple-600/10", iconColor: "text-purple-400",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg> },
    { label: "Subscriptions", value: data?.totalSubscriptions ?? 0, color: "from-cyan-500/20 to-cyan-600/10", iconColor: "text-cyan-400",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg> },
    { label: "Active Subs", value: data?.activeSubscriptions ?? 0, color: "from-teal-500/20 to-teal-600/10", iconColor: "text-teal-400",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> },
    { label: "Total Clients", value: data?.totalClients ?? 0, color: "from-indigo-500/20 to-indigo-600/10", iconColor: "text-indigo-400",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg> },
    { label: "Monthly Revenue", value: `$${(data?.monthlyRevenue ?? 0).toLocaleString()}`, color: "from-amber-500/20 to-amber-600/10", iconColor: "text-amber-400",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { label: "Annual Revenue", value: `$${(data?.annualRevenue ?? 0).toLocaleString()}`, color: "from-orange-500/20 to-orange-600/10", iconColor: "text-orange-400",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg> },

    { label: "Previous Month", value: `$${(data?.previousMonthRevenue ?? 0).toLocaleString()}`, color: "from-fuchsia-500/20 to-fuchsia-600/10", iconColor: "text-fuchsia-400",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg> },
    { label: "Renewals", value: `$${(data?.renewalsRevenue ?? 0).toLocaleString()}`, color: "from-lime-500/20 to-lime-600/10", iconColor: "text-lime-400",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865A8.25 8.25 0 0117.834 6.165l3.181 3.182" /></svg> },
    { label: "Manual Revenue", value: `$${(data?.manualRevenue ?? 0).toLocaleString()}`, color: "from-rose-500/20 to-rose-600/10", iconColor: "text-rose-400",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m3-9H9m12 3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
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
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Product</th>
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
                  <td className="px-6 py-4"><span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-400">{l.product?.name || "—"}</span></td>
                  <td className="px-6 py-4"><span className={`badge-${l.status}`}><span className={`h-1.5 w-1.5 rounded-full ${l.status === "active" ? "bg-emerald-400" : l.status === "expired" ? "bg-red-400" : "bg-amber-400"}`} />{l.status}</span></td>
                  <td className="px-6 py-4"><span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-white/50 uppercase">{l.plan}</span></td>
                  <td className="px-6 py-4 text-sm text-white/40">{new Date(l.expiresAt).toLocaleDateString()}</td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-white/30">No licenses yet. Create your first one!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
