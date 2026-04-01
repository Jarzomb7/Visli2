"use client";

import { useEffect, useState, useCallback, useMemo } from "react";

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
  id: number;
  status: string;
  plan: string;
  productCode: string | null;
  cancelAt: string | null;
  currentPeriodEnd: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
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
  const [error, setError] = useState<string | null>(null);
  const [buyingPlan, setBuyingPlan] = useState<number | null>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [planRes, subRes] = await Promise.all([
        fetch("/api/client/plans"),
        fetch("/api/client/subscriptions"),
      ]);

      const [planData, subData] = await Promise.all([planRes.json(), subRes.json()]);

      if (!planRes.ok) throw new Error(planData.error || "Failed to load plans");
      if (!subRes.ok) throw new Error(subData.error || "Failed to load subscriptions");

      setPlans(planData.plans || []);
      setSubs(subData.subscriptions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
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
      if (!res.ok) throw new Error(data.error || "Failed to create checkout");
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Stripe checkout URL not available");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Network error");
    } finally {
      setBuyingPlan(null);
    }
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
      if (!res.ok) throw new Error(data.error || "Failed to cancel subscription");
      setCancelId(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Network error");
    } finally {
      setCancelling(false);
    }
  };

  const activeSub = useMemo(() => subs.find((s) => s.status === "active"), [subs]);
  const hasActiveSub = Boolean(activeSub);

  if (loading) {
    return (
      <div className="animate-fade-in pt-8 lg:pt-0">
        <div className="h-8 w-56 rounded-lg bg-white/[0.06] animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => <div key={i} className="glass-card h-24 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map((i) => <div key={i} className="glass-card h-64 animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Subscription & Plans</h1>
        <p className="mt-1 text-sm text-white/40">Understand your current plan instantly and upgrade in one click.</p>
      </div>

      {error && (
        <div className="mb-6 glass-card border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm text-red-300">{error}</p>
          <button onClick={load} className="mt-3 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-white/30">Current Plan</p>
          <p className="mt-2 text-lg font-semibold text-white">{activeSub ? activeSub.plan.toUpperCase() : "No active plan"}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-white/30">Renewal</p>
          <p className="mt-2 text-lg font-semibold text-white">{activeSub?.currentPeriodEnd ? new Date(activeSub.currentPeriodEnd).toLocaleDateString() : "—"}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-white/30">Recommended action</p>
          <p className="mt-2 text-sm text-white/70">{hasActiveSub ? "Need more limits? Upgrade below." : "Start now by choosing a plan."}</p>
        </div>
      </div>

      {subs.length > 0 ? (
        <div className="mb-8">
          <h2 className="font-display text-lg font-semibold text-white mb-4">Your subscriptions</h2>
          <div className="space-y-4">
            {subs.map((s) => (
              <div key={s.id} className="glass-card overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-white">{s.product?.name || s.productCode || s.plan}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
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
      ) : (
        <div className="glass-card p-8 mb-8 text-center">
          <p className="text-sm text-white/35">No subscriptions yet.</p>
          <p className="text-sm text-white/55 mt-2">Pick a plan below to activate your account and start using VISLI products.</p>
        </div>
      )}

      <h2 className="font-display text-lg font-semibold text-white mb-4">{hasActiveSub ? "Upgrade or change plan" : "Choose your first plan"}</h2>
      {plans.length === 0 ? (
        <div className="glass-card px-6 py-16 text-center text-sm text-white/30">No plans available right now. Contact support.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {plans.map((plan) => (
            <div key={plan.planId} className="glass-card p-6 hover:border-white/[0.12] transition-all duration-300 flex flex-col">
              <div className="flex-1">
                <h3 className="font-display text-xl font-bold text-white">{plan.planName}</h3>
                <p className="mt-4 font-display text-3xl font-bold text-white">{plan.priceMonthly} <span className="text-base text-white/30 font-normal">zł/mies.</span></p>
                <div className="mt-4 space-y-2 text-xs text-white/60">
                  <p>Products: {plan.products.length ? plan.products.join(", ") : "All"}</p>
                  {Object.keys(plan.limits).length > 0 && <p>Limits: {Object.entries(plan.limits).map(([k, v]) => `${k}: ${v}`).join(" • ")}</p>}
                </div>
              </div>
              <button
                onClick={() => buyPlan(plan.planId)}
                disabled={buyingPlan === plan.planId}
                className="btn-primary w-full mt-6"
              >
                {buyingPlan === plan.planId ? "Redirecting..." : hasActiveSub ? "Upgrade / Switch" : "Start Subscription"}
              </button>
            </div>
          ))}
        </div>
      )}

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
