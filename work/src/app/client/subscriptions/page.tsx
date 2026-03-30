"use client";

import { useEffect, useState, useCallback } from "react";

interface Sub {
  id: number; status: string; plan: string; productCode: string | null; cancelAt: string | null;
  currentPeriodEnd: string | null; stripeSubscriptionId: string | null; createdAt: string;
  product: { name: string; code: string } | null;
  license: { id: number; key: string; domain: string; status: string; expiresAt: string; features: string[] } | null;
}

export default function ClientSubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/client/subscriptions").then((r) => r.json()).then((d) => setSubs(d.subscriptions || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id: number) => {
    setCancelling(true);
    try {
      const res = await fetch("/api/client/subscriptions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscriptionId: id }) });
      const data = await res.json();
      if (res.ok) { setCancelId(null); load(); } else { alert(data.error || "Failed"); }
    } catch { alert("Network error"); }
    finally { setCancelling(false); }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Subscriptions</h1>
        <p className="mt-1 text-sm text-white/40">Manage your active subscriptions</p>
      </div>

      <div className="space-y-4">
        {loading ? [1,2].map((i) => <div key={i} className="glass-card h-40 animate-pulse" />) : subs.length === 0 ? (
          <div className="glass-card px-6 py-16 text-center text-sm text-white/30">No subscriptions yet.</div>
        ) : subs.map((s) => (
          <div key={s.id} className="glass-card overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-white">{s.product?.name || s.productCode}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-white/50 uppercase">{s.plan}</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${s.status === "active" ? "bg-emerald-500/10 text-emerald-400" : s.status === "past_due" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.status === "active" ? "bg-emerald-400" : s.status === "past_due" ? "bg-amber-400" : "bg-red-400"}`} />{s.status}
                    </span>
                    {s.cancelAt && <span className="text-[11px] text-red-400">Cancels {new Date(s.cancelAt).toLocaleDateString()}</span>}
                  </div>
                </div>
                {s.status === "active" && !s.cancelAt && (
                  <button onClick={() => setCancelId(s.id)} className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all">
                    Cancel
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/25 mb-1">Renewal Date</p>
                  <p className="text-sm text-white/60">{s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/25 mb-1">License</p>
                  {s.license ? <code className="font-mono text-xs text-[#5f83f4]">{s.license.key}</code> : <p className="text-xs text-white/30">—</p>}
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/25 mb-1">Domain</p>
                  <p className="text-sm text-white/60">{s.license?.domain === "PENDING" ? <span className="text-amber-400">Not set</span> : s.license?.domain || "—"}</p>
                </div>
              </div>

              {s.license && s.license.features.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/[0.05]">
                  <p className="text-[11px] uppercase tracking-wider text-white/25 mb-2">Features</p>
                  <div className="flex flex-wrap gap-1.5">
                    {s.license.features.map((f) => (
                      <span key={f} className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">{f}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {cancelId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-sm p-6 animate-fade-in">
            <h3 className="font-display text-lg font-semibold text-white">Cancel Subscription</h3>
            <p className="mt-2 text-sm text-white/40">Your subscription will remain active until the end of the current billing period.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setCancelId(null)} className="btn-ghost flex-1">Keep</button>
              <button onClick={() => handleCancel(cancelId)} disabled={cancelling} className="btn-danger flex-1">{cancelling ? "Cancelling..." : "Cancel Subscription"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
