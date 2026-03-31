"use client";

import { useEffect, useState, useCallback } from "react";

interface Sub {
  id: number; status: string; plan: string; productCode: string | null; cancelAt: string | null;
  currentPeriodEnd: string | null; stripeSubscriptionId: string | null;
  product: { name: string; code: string } | null;
  license: { id: number; key: string; domain: string; status: string; expiresAt: string; features: string[] } | null;
}

interface Plan {
  id: number;
  name: string;
  description: string | null;
  priceMonthly: number;
  stripePriceId: string;
  features: string[] | null;
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400",
  past_due: "bg-amber-500/10 text-amber-400",
  canceled: "bg-red-500/10 text-red-400",
  trialing: "bg-blue-500/10 text-blue-400",
  incomplete: "bg-white/[0.06] text-white/40",
};

export default function ClientSubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [buying, setBuying] = useState<number | null>(null);
  const [changingId, setChangingId] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Record<number, number>>({});
  const [userEmail, setUserEmail] = useState("");

  const loadSubs = useCallback(() => {
    setLoading(true);
    fetch("/api/client/subscriptions")
      .then((r) => r.json())
      .then((d) => {
        setSubs(d.subscriptions || []);
        setPlans((d.plans || []).sort((a: Plan, b: Plan) => a.priceMonthly - b.priceMonthly));
      })
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

  const handleBuy = async (planId: number) => {
    if (!userEmail) { alert("Could not load your email. Please refresh."); return; }
    setBuying(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, planId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "Failed to create checkout");
    } catch {
      alert("Network error");
    } finally {
      setBuying(null);
    }
  };

  const handleChangePlan = async (subscriptionId: number, planId: number) => {
    setChangingId(subscriptionId);
    try {
      const res = await fetch("/api/client/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, planId }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Failed to change plan");
      else loadSubs();
    } catch {
      alert("Network error");
    } finally {
      setChangingId(null);
    }
  };

  const activeSubscription = subs.find((sub) => sub.status === "active" || sub.status === "trialing") || null;

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Subskrypcja / Billing</h1>
      </div>

      <div className="mb-8">
        <h2 className="font-display text-lg font-semibold text-white mb-4">Plany</h2>
        {plans.length === 0 ? (
          <div className="glass-card px-6 py-10 text-center text-sm text-white/40">Brak dostępnych pakietów</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const currentPlan = (activeSubscription?.plan || "").toLowerCase() === plan.name.toLowerCase();
              return (
                <div key={plan.id} className="glass-card p-6">
                  <h3 className="font-display text-base font-semibold text-white">{plan.name}</h3>
                  <p className="mt-2 text-3xl font-bold text-white">${plan.priceMonthly}<span className="text-sm text-white/30">/mies.</span></p>
                  <p className="mt-2 text-xs text-white/40">{plan.description || ""}</p>
                  <ul className="mt-3 space-y-1">{(plan.features || []).map((f) => <li key={f} className="text-xs text-white/50">• {f}</li>)}</ul>
                  {activeSubscription ? (
                    <button
                      onClick={() => { if (!currentPlan) handleChangePlan(activeSubscription.id, plan.id); }}
                      disabled={currentPlan || changingId === activeSubscription.id}
                      className="btn-primary w-full mt-4"
                    >
                      {currentPlan ? "Aktualny plan" : "Zmień plan"}
                    </button>
                  ) : (
                    <button onClick={() => handleBuy(plan.id)} disabled={buying === plan.id} className="btn-primary w-full mt-4">
                      {buying === plan.id ? "Przekierowanie..." : "Kup"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <h2 className="font-display text-lg font-semibold text-white mb-4">Twoja subskrypcja</h2>
      {loading ? <div className="glass-card h-40 animate-pulse" /> : subs.length === 0 ? (
        <div className="glass-card px-6 py-12 text-center text-sm text-white/30">Brak aktywnej subskrypcji.</div>
      ) : (
        <div className="space-y-4">
          {subs.map((s) => (
            <div key={s.id} className="glass-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{s.product?.name || s.plan}</p>
                  <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs ${statusColors[s.status] || statusColors.incomplete}`}>{s.status}</span>
                  <p className="mt-2 text-xs text-white/40">Następna płatność: {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : "—"}</p>
                  <p className="text-xs text-white/40">Licencja: {s.license?.key || "—"}</p>
                </div>
                {s.status === "active" && !s.cancelAt && (
                  <button onClick={() => setCancelId(s.id)} className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs font-medium text-red-400">Anuluj subskrypcję</button>
                )}
              </div>
              {s.status === "active" && (
                <div className="mt-4 flex gap-3">
                  <select
                    value={selectedPlan[s.id] || ""}
                    onChange={(e) => setSelectedPlan((prev) => ({ ...prev, [s.id]: Number(e.target.value) }))}
                    className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm text-white"
                  >
                    <option value="">Wybierz plan</option>
                    {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                  </select>
                  <button onClick={() => selectedPlan[s.id] && handleChangePlan(s.id, selectedPlan[s.id])} disabled={!selectedPlan[s.id] || changingId === s.id} className="btn-ghost">
                    {changingId === s.id ? "Aktualizacja..." : "Zmień plan"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {cancelId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-sm p-6">
            <h3 className="font-display text-lg font-semibold text-white">Anuluj subskrypcję</h3>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setCancelId(null)} className="btn-ghost flex-1">Zachowaj</button>
              <button onClick={() => handleCancel(cancelId)} disabled={cancelling} className="flex-1 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400">{cancelling ? "Anulowanie..." : "Anuluj subskrypcję"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
