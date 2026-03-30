"use client";

import { useEffect, useState, useCallback } from "react";

interface Addon { id: number; type: string; amount: number; status: string; meta: string | null; createdAt: string; }

const addonTypes = [
  { type: "sms_pack", name: "SMS Package", desc: "500 SMS credits for notifications", icon: "💬", amount: 500 },
  { type: "ai_credits", name: "AI Credits", desc: "1000 AI response credits", icon: "🤖", amount: 1000 },
];

export default function ClientBillingPage() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [buyingType, setBuyingType] = useState<string | null>(null);

  const loadAddons = useCallback(() => {
    fetch("/api/client/addons").then((r) => r.json()).then((d) => setAddons(d.addons || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAddons(); }, [loadAddons]);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/customer-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { alert(data.error || "Could not open billing portal"); setPortalLoading(false); }
    } catch { alert("Network error"); setPortalLoading(false); }
  };

  const buyAddon = async (type: string) => {
    setBuyingType(type);
    try {
      const res = await fetch("/api/client/addons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) });
      const data = await res.json();
      if (res.ok) { loadAddons(); } else { alert(data.error || "Failed"); }
    } catch { alert("Network error"); }
    finally { setBuyingType(null); }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Billing</h1>
        <p className="mt-1 text-sm text-white/40">Manage payments, invoices, and addons</p>
      </div>

      {/* Stripe Portal */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-white">Stripe Billing Portal</h2>
            <p className="mt-1 text-sm text-white/40">Update payment method, view invoices, manage subscription</p>
          </div>
          <button onClick={openPortal} disabled={portalLoading} className="btn-primary">
            {portalLoading ? (
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
            ) : "Open Portal"}
          </button>
        </div>
      </div>

      {/* Addons */}
      <h2 className="font-display text-lg font-semibold text-white mb-4">Add-ons</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {addonTypes.map((a) => (
          <div key={a.type} className="glass-card p-6 hover:border-white/[0.12] transition-all duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl mb-2">{a.icon}</p>
                <h3 className="font-display text-base font-semibold text-white">{a.name}</h3>
                <p className="mt-1 text-xs text-white/40">{a.desc}</p>
              </div>
              <button onClick={() => buyAddon(a.type)} disabled={buyingType === a.type} className="btn-ghost px-4 py-2 text-xs">
                {buyingType === a.type ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Purchased addons */}
      <h2 className="font-display text-lg font-semibold text-white mb-4">Your Add-ons</h2>
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.05]">
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Type</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Amount</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Status</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? [1,2].map((i) => (
              <tr key={i} className="border-b border-white/[0.03]">{[1,2,3,4].map((j) => <td key={j} className="px-6 py-4"><div className="h-4 w-16 rounded bg-white/[0.04] animate-pulse" /></td>)}</tr>
            )) : addons.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-white/30">No add-ons purchased yet.</td></tr>
            ) : addons.map((a) => (
              <tr key={a.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4 text-sm text-white/70">{a.meta || a.type}</td>
                <td className="px-6 py-4"><span className="font-mono text-sm text-emerald-400">{a.amount.toLocaleString()}</span></td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{a.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-white/40">{new Date(a.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
