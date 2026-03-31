"use client";

import { useEffect, useState, useCallback } from "react";

interface Sub {
  id: number; status: string; plan: string; productCode: string | null; cancelAt: string | null;
  currentPeriodEnd: string | null; stripeSubscriptionId: string | null; createdAt: string;
  product: { name: string; code: string } | null;
  license: { id: number; key: string; domain: string; status: string; expiresAt: string; features: string[] } | null;
}

interface Product {
  id: number; name: string; code: string; description: string | null;
  stripePriceId: string | null; paymentType: string; priceCents: number | null; active: boolean;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");

  const loadSubs = useCallback(() => {
    setLoading(true);
    fetch("/api/client/subscriptions").then((r) => r.json()).then((d) => setSubs(d.subscriptions || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSubs();
    fetch("/api/products").then((r) => r.json()).then((d) => setProducts((d.products || []).filter((p: Product) => p.active && p.stripePriceId))).catch(console.error).finally(() => setProductsLoading(false));
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

  const handleBuy = async (product: Product) => {
    if (!userEmail) { alert("Could not load your email. Please refresh."); return; }
    setBuying(product.code);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, productCode: product.code }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { alert(data.error || "Failed to create checkout"); setBuying(null); }
    } catch { alert("Network error"); setBuying(null); }
  };

  // Products the user doesn't already have an active sub for
  const activeProductCodes = new Set(subs.filter(s => s.status === "active").map(s => s.productCode));
  const availableProducts = products.filter(p => !activeProductCodes.has(p.code));

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Subscriptions</h1>
        <p className="mt-1 text-sm text-white/40">Manage your subscriptions and purchase new plans</p>
      </div>

      {/* ━━━ Available Plans ━━━ */}
      {availableProducts.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-lg font-semibold text-white mb-4">Available Plans</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableProducts.map((p) => (
              <div key={p.id} className="glass-card overflow-hidden hover:border-[#3b5eee]/30 transition-all duration-300">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#3b5eee]/20 to-[#1e3fdb]/10 text-lg">
                      {p.paymentType === "subscription" ? "🔄" : "💳"}
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold text-white">{p.name}</h3>
                      <span className="text-[10px] font-medium uppercase text-white/25">
                        {p.paymentType === "subscription" ? "Subscription" : "One-time"}
                      </span>
                    </div>
                  </div>
                  {p.description && <p className="text-xs text-white/40 mb-4 leading-relaxed">{p.description}</p>}
                  <div className="flex items-end gap-1 mb-5">
                    <span className="font-display text-3xl font-bold text-white">
                      ${p.priceCents ? (p.priceCents / 100).toFixed(2) : "—"}
                    </span>
                    {p.paymentType === "subscription" && <span className="text-sm text-white/30 mb-1">/mo</span>}
                  </div>
                  <button
                    onClick={() => handleBuy(p)}
                    disabled={buying === p.code}
                    className="btn-primary w-full"
                  >
                    {buying === p.code ? (
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    ) : "Buy Now"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {productsLoading && availableProducts.length === 0 && (
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2].map(i => <div key={i} className="glass-card h-56 animate-pulse" />)}
        </div>
      )}

      {/* ━━━ Current Subscriptions ━━━ */}
      <h2 className="font-display text-lg font-semibold text-white mb-4">Your Subscriptions</h2>
      <div className="space-y-4">
        {loading ? [1,2].map((i) => <div key={i} className="glass-card h-40 animate-pulse" />) : subs.length === 0 ? (
          <div className="glass-card px-6 py-16 text-center text-sm text-white/30">No subscriptions yet. Purchase a plan above to get started.</div>
        ) : subs.map((s) => (
          <div key={s.id} className="glass-card overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-white">{s.product?.name || s.productCode}</h3>
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
            </div>
          </div>
        ))}
      </div>

      {/* Cancel modal */}
      {cancelId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-sm p-6 animate-fade-in">
            <h3 className="font-display text-lg font-semibold text-white">Cancel Subscription</h3>
            <p className="mt-2 text-sm text-white/40">Your subscription will remain active until the end of the current billing period.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setCancelId(null)} className="btn-ghost flex-1">Keep</button>
              <button onClick={() => handleCancel(cancelId)} disabled={cancelling} className="flex-1 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50">{cancelling ? "Cancelling..." : "Cancel Subscription"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
