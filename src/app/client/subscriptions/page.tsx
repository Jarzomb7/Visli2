"use client";

import { useEffect, useState, useCallback } from "react";
import { BILLING_PLANS, BillingPlan } from "@/lib/billing-plans";

interface Sub {
  id: number; status: string; plan: string; productCode: string | null; cancelAt: string | null;
  currentPeriodEnd: string | null; stripeSubscriptionId: string | null; createdAt: string;
  product: { name: string; code: string } | null;
  license: { id: number; key: string; domain: string; status: string; expiresAt: string; features: string[] } | null;
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400",
  past_due: "bg-amber-500/10 text-amber-400",
  canceled: "bg-red-500/10 text-red-400",
  incomplete: "bg-white/[0.06] text-white/40",
};
const statusDots: Record<string, string> = {
  active: "bg-emerald-400", past_due: "bg-amber-400", canceled: "bg-red-400", incomplete: "bg-white/30",
};

export default function ClientSubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [changingId, setChangingId] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Record<number, string>>({});
  const [userEmail, setUserEmail] = useState("");

  const loadSubs = useCallback(() => {
    setLoading(true);
    fetch("/api/client/subscriptions")
      .then((r) => r.json())
      .then((d) => setSubs(d.subscriptions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSubs();
    fetch("/api/auth/me").then((r) => r.json()).then((d) => { if (d.user?.email) setUserEmail(d.user.email); }).catch(() => {});
  }, [loadSubs]);

  const handleCancel = async (id: number) => {
    setCancelling(true);
    try {
      const res = await fetch("/api/client/subscriptions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscriptionId: id }) });
      if (res.ok) { setCancelId(null); loadSubs(); } else { const d = await res.json(); alert(d.error || "Failed"); }
    } catch { alert("Network error"); }
    finally { setCancelling(false); }
  };

  const handleBuy = async (plan: BillingPlan) => {
    if (!userEmail) { alert("Could not load your email. Please refresh."); return; }
    setBuying(plan.id);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, plan: plan.id }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { alert(data.error || "Failed to create checkout"); setBuying(null); }
    } catch { alert("Network error"); setBuying(null); }
  };

  const handleChangePlan = async (subscriptionId: number, plan: string) => {
    if (!plan) return;
    setChangingId(subscriptionId);
    try {
      const res = await fetch("/api/client/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to change plan");
      } else {
        loadSubs();
      }
    } catch {
      alert("Network error");
    } finally {
      setChangingId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Subskrypcja / Billing</h1>
        <p className="mt-1 text-sm text-white/40">Kup plan, zmień plan i zarządzaj subskrypcją</p>
      </div>

      <div className="mb-8">
        <h2 className="font-display text-lg font-semibold text-white mb-4">Plany</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BILLING_PLANS.map((plan) => {
            const activeSubscription = subs.find((sub) => sub.status === "active" || sub.status === "trialing");
            const currentPlanKey = (activeSubscription?.plan || activeSubscription?.productCode || "").toLowerCase();
            const isCurrentPlan = currentPlanKey === plan.id || currentPlanKey === plan.productCode.toLowerCase();

            return (
            <div key={plan.id} className="glass-card overflow-hidden hover:border-[#3b5eee]/30 transition-all duration-300">
              <div className="p-6">
                <h3 className="font-display text-base font-semibold text-white">{plan.name}</h3>
                <div className="mt-2 flex items-end gap-1">
                  <span className="font-display text-3xl font-bold text-white">${plan.priceMonthly}</span>
                  <span className="text-sm text-white/30 mb-1">/mies.</span>
                </div>
                <p className="mt-2 text-xs text-white/40">Max licenses: {plan.maxLicenses}</p>
                <ul className="mt-3 space-y-1">
                  {plan.features.map((f) => <li key={f} className="text-xs text-white/50">• {f}</li>)}
                </ul>
                {activeSubscription ? (
                  <button
                    onClick={() => {
                      if (isCurrentPlan) return;
                      handleChangePlan(activeSubscription.id, plan.id);
                    }}
                    disabled={isCurrentPlan || changingId === activeSubscription.id}
                    className="btn-primary w-full mt-4"
                  >
                    {isCurrentPlan ? "Aktualny plan" : changingId === activeSubscription.id ? "Aktualizacja..." : "Zmień plan"}
                  </button>
                ) : (
                  <button onClick={() => handleBuy(plan)} disabled={buying === plan.id} className="btn-primary w-full mt-4">
                    {buying === plan.id ? "Przekierowanie..." : "Kup plan"}
                  </button>
                )}
              </div>
            </div>
          );
          })}
        </div>
      </div>

      <h2 className="font-display text-lg font-semibold text-white mb-4">Twoja subskrypcja</h2>
      <div className="space-y-4">
        {loading ? [1,2].map((i) => <div key={i} className="glass-card h-40 animate-pulse" />) : subs.length === 0 ? (
          <div className="glass-card px-6 py-16 text-center text-sm text-white/30">No subscriptions yet. Purchase a plan above to get started.</div>
        ) : subs.map((s) => (
          <div key={s.id} className="glass-card overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-white">{s.product?.name || s.productCode || s.plan}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-white/50 uppercase">{s.plan}</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusColors[s.status] || statusColors.incomplete}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDots[s.status] || statusDots.incomplete}`} />{s.status}
                    </span>
                    {s.cancelAt && <span className="text-[11px] text-red-400">Cancels {new Date(s.cancelAt).toLocaleDateString()}</span>}
                  </div>
                </div>
                {s.status === "active" && !s.cancelAt && (
                  <button onClick={() => setCancelId(s.id)} className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all">
                    Anuluj subskrypcję
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

              {s.status === "active" && (
                <div className="mt-5 border-t border-white/[0.05] pt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <select
                    value={selectedPlan[s.id] || ""}
                    onChange={(e) => setSelectedPlan((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm text-white"
                  >
                    <option value="">Wybierz plan</option>
                    {BILLING_PLANS.map((plan) => (
                      <option key={plan.id} value={plan.id}>{plan.name}</option>
                    ))}
                  </select>
                  <button onClick={() => handleChangePlan(s.id, selectedPlan[s.id] || "")} disabled={!selectedPlan[s.id] || changingId === s.id} className="btn-ghost">
                    {changingId === s.id ? "Aktualizacja..." : "Zmień plan"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {cancelId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-sm p-6 animate-fade-in">
            <h3 className="font-display text-lg font-semibold text-white">Anuluj subskrypcję</h3>
            <p className="mt-2 text-sm text-white/40">Your subscription will remain active until the end of the current billing period.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setCancelId(null)} className="btn-ghost flex-1">Zachowaj</button>
              <button onClick={() => handleCancel(cancelId)} disabled={cancelling} className="flex-1 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50">{cancelling ? "Anulowanie..." : "Anuluj subskrypcję"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
