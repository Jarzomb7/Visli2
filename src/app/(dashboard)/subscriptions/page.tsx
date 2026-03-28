"use client";

import { useEffect, useState, useCallback } from "react";

interface Subscription {
  id: number;
  email: string;
  stripeSubscriptionId: string | null;
  status: string;
  plan: string;
  productCode: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400",
  past_due: "bg-amber-500/10 text-amber-400",
  canceled: "bg-red-500/10 text-red-400",
  incomplete: "bg-white/[0.06] text-white/40",
};

const statusDots: Record<string, string> = {
  active: "bg-emerald-400",
  past_due: "bg-amber-400",
  canceled: "bg-red-400",
  incomplete: "bg-white/30",
};

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), limit: "15", search, status: statusFilter });
      const res = await fetch(`/api/subscriptions?${p}`);
      const d = await res.json();
      setSubs(d.subscriptions || []);
      setTotalPages(d.totalPages || 1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Subscriptions</h1>
        <p className="mt-1 text-sm text-white/40">Stripe subscription management</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="glass-input pl-10" placeholder="Search by email..." />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="glass-input w-full sm:w-40">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Canceled</option>
          <option value="incomplete">Incomplete</option>
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.05]">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Email</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Product</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Plan</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Status</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Renewal</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-white/[0.03]">{[...Array(6)].map((_, j) => <td key={j} className="px-6 py-4"><div className="h-4 w-20 rounded bg-white/[0.04] animate-pulse" /></td>)}</tr>
              )) : subs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center text-sm text-white/30">No subscriptions found.</td></tr>
              ) : subs.map((s) => (
                <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-semibold text-white/40">
                        {s.email[0].toUpperCase()}
                      </div>
                      <span className="text-sm text-white/70">{s.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-400">
                      {s.productCode || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-white/50 uppercase">{s.plan}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusColors[s.status] || statusColors.incomplete}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDots[s.status] || statusDots.incomplete}`} />
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/40">
                    {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-white/30">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/[0.05] px-6 py-4">
            <p className="text-xs text-white/30">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-30">Previous</button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
