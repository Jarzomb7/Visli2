"use client";

import { useEffect, useState, useCallback } from "react";

interface Plan {
  planId: number;
  planName: string;
  priceMonthly: number;
  stripePriceId: string;
  products: string[];
  limits: Record<string, number>;
  productLimits: Record<string, Record<string, number>>;
  isActive: boolean;
}
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

export default function ClientSubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingPlan, setBuyingPlan] = useState<number | null>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/client/plans").then((r) => r.json()),
      fetch("/api/client/subscriptions").then((r) => r.json()),
    ]).then(([planData, subData]) => {
      setPlans(planData.plans || []);
      setSubs(subData.subscriptions || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const buyPlan = async (planId: number) => {
    setBuyingPlan(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "Failed to create checkout");
    } catch { alert("Network error"); }
    finally { setBuyingPlan(null); }
  };

  const handleCancel = async (id: number) => {
    setCancelling(true);
    try {
      const res = await fetch("/api/client/subscriptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: id }),
      });
      const data = await res.json();
      if (res.ok) { setCancelId(null); load(); }
      else alert(data.error || "Failed");
    } catch { alert("Network error"); }
    finally { setCancelling(false); }
  };

  if (loading) {
    return (
      <div className="animate-fade-in pt-8 lg:pt-0">
        <div className="h-8 w-48 rounded-lg bg-white/[0.06] animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[1,2,3,4].map((i) => <div key={i} className="glass-card h-48 animate-pulse" />)}</div>
      </div>
    );
  }

  const hasActiveSub = subs.some((s) => s.status === "active");

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Subscriptions</h1>
        <p className="mt-1 text-sm text-white/40">Manage your subscription or choose a plan</p>
      </div>

      {/* Current subscriptions */}
      {subs.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-lg font-semibold text-white mb-4">Your Subscriptions</h2>
          <div className="space-y-4">
            {subs.map((s) => (
              <div key={s.id} className="glass-card overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-white">{s.product?.name || s.productCode || s.plan}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-white/50 uppercase">{s.plan}</span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusColors[s.status] || statusColors.incomplete}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.status === "active" ? "bg-emerald-400" : s.status === "past_due" ? "bg-amber-400" : "bg-red-400"}`} />{s.status}
                        </span>
                        {s.cancelAt && <span className="text-[11px] text-red-400">Cancels {new Date(s.cancelAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    {s.status === "active" && !s.cancelAt && (
                      <button onClick={() => setCancelId(s.id)} className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all">Cancel</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available plans */}
      {plans.length > 0 && (
        <>
          <h2 className="font-display text-lg font-semibold text-white mb-4">{hasActiveSub ? "Change Plan" : "Choose a Plan"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {plans.map((plan) => (
              <div key={plan.planId} className="glass-card p-6 hover:border-white/[0.12] transition-all duration-300 flex flex-col">
                <div className="flex-1">
                  <h3 className="font-display text-xl font-bold text-white">{plan.planName}</h3>
                                    <p className="mt-4 font-display text-3xl font-bold text-white">{plan.priceMonthly} <span className="text-base text-white/30 font-normal">zł/mies.</span></p>
                  <div className="mt-4 space-y-2 text-xs text-white/60">
                    <p>Products: {plan.products.length ? plan.products.join(", ") : "All"}</p>
                    {Object.keys(plan.limits).length > 0 && (
                      <p>Limits: {Object.entries(plan.limits).map(([k,v]) => `${k}: ${v}`).join(" • ")}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => buyPlan(plan.planId)}
                  disabled={buyingPlan === plan.planId}
                  className="btn-primary w-full mt-6"
                >
                  {buyingPlan === plan.planId ? "Redirecting..." : hasActiveSub ? "Switch to this plan" : "Subscribe"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {plans.length === 0 && subs.length === 0 && (
        <div className="glass-card px-6 py-16 text-center text-sm text-white/30">No plans available. Contact administrator.</div>
      )}

      {/* Cancel modal */}
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
