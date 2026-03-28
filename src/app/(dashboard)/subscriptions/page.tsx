"use client";

import { useEffect, useState, useCallback } from "react";

interface Subscription {
  id: number;
  email: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  status: string;
  plan: string;
  productCode: string | null;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  createdAt: string;
  license: { id: number; key: string; domain: string; status: string } | null;
  product: { id: number; name: string; code: string } | null;
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
  const [expanded, setExpanded] = useState<number | null>(null);

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

      <div className="space-y-3">
        {loading ? [...Array(4)].map((_, i) => (
          <div key={i} className="glass-card h-20 animate-pulse" />
        )) : subs.length === 0 ? (
          <div className="glass-card px-6 py-16 text-center text-sm text-white/30">No subscriptions found.</div>
        ) : subs.map((s) => (
          <div key={s.id} className="glass-card overflow-hidden hover:border-white/[0.12] transition-all duration-300">
            <button
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              className="flex w-full items-center justify-between px-6 py-5 text-left"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-sm font-semibold text-white/40">
                  {s.email[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white/80 truncate">{s.email}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                      {s.product?.name || s.productCode || "—"}
                    </span>
                    <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/40 uppercase">{s.plan}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusColors[s.status] || statusColors.incomplete}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusDots[s.status] || statusDots.incomplete}`} />
                  {s.status}
                </span>
                <svg className={`h-4 w-4 text-white/20 transition-transform duration-200 ${expanded === s.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </button>

            {expanded === s.id && (
              <div className="border-t border-white/[0.05] px-6 py-5 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Stripe Info */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25 mb-2">Stripe</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-white/30 w-16 shrink-0">Customer</span>
                        <code className="font-mono text-[11px] text-[#5f83f4] truncate">{s.stripeCustomerId || "—"}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-white/30 w-16 shrink-0">Sub ID</span>
                        <code className="font-mono text-[11px] text-[#5f83f4] truncate">{s.stripeSubscriptionId || "—"}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-white/30 w-16 shrink-0">Price</span>
                        <code className="font-mono text-[11px] text-white/40 truncate">{s.stripePriceId || "—"}</code>
                      </div>
                    </div>
                  </div>

                  {/* License Info */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25 mb-2">Linked License</p>
                    {s.license ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-white/30 w-16 shrink-0">Key</span>
                          <code className="font-mono text-[11px] text-emerald-400 truncate">{s.license.key}</code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-white/30 w-16 shrink-0">Domain</span>
                          <span className="text-[11px] text-white/60">{s.license.domain === "PENDING" ? <span className="text-amber-400">PENDING</span> : s.license.domain}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-white/30 w-16 shrink-0">Status</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[s.license.status] || statusColors.incomplete}`}>
                            <span className={`h-1 w-1 rounded-full ${statusDots[s.license.status] || statusDots.incomplete}`} />
                            {s.license.status}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-white/25">No license linked</p>
                    )}
                  </div>

                  {/* Dates */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25 mb-2">Dates</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-white/30 w-16 shrink-0">Renewal</span>
                        <span className="text-[11px] text-white/60">{s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : "—"}</span>
                      </div>
                      {s.cancelAt && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-white/30 w-16 shrink-0">Cancels</span>
                          <span className="text-[11px] text-red-400">{new Date(s.cancelAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-white/30 w-16 shrink-0">Created</span>
                        <span className="text-[11px] text-white/40">{new Date(s.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-white/30">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-30">Previous</button>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-30">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
