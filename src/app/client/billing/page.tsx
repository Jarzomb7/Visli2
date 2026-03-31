"use client";

import { useEffect, useState, useCallback } from "react";

interface SubData {
  id: number; status: string; plan: string; currentPeriodEnd: string | null; cancelAt: string | null;
  product: { name: string; code: string; priceCents: number | null; paymentType: string } | null;
  license: { key: string; domain: string; status: string; expiresAt: string } | null;
}
interface Invoice { id: string; date: string; amount: number; status: string; url: string | null; }
interface Addon { id: number; type: string; amount: number; status: string; meta: string | null; createdAt: string; }
interface AssignedLicense { id: number; key: string; domain: string; status: string; expiresAt: string; plan: string; }

const smsPackages = [
  { id: "sms_100", name: "100 SMS", amount: 20, credits: 100 },
  { id: "sms_500", name: "500 SMS", amount: 80, credits: 500 },
];

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400",
  past_due: "bg-amber-500/10 text-amber-400",
  canceled: "bg-red-500/10 text-red-400",
  paid: "bg-emerald-500/10 text-emerald-400",
  open: "bg-amber-500/10 text-amber-400",
};

export default function ClientBillingPage() {
  const [sub, setSub] = useState<SubData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [assignedLicenses, setAssignedLicenses] = useState<AssignedLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [buyingType, setBuyingType] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/client/billing").then(r => r.json()),
      fetch("/api/client/addons").then(r => r.json()),
    ]).then(([billingData, addonData]) => {
      setSub(billingData.subscription || null);
      setInvoices(billingData.invoices || []);
      setAssignedLicenses(billingData.assignedLicenses || []);
      setAddons(addonData.addons || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { alert(data.error || "Could not open billing portal"); setPortalLoading(false); }
    } catch { alert("Network error"); setPortalLoading(false); }
  };

  const buyAddon = async (packageId: string) => {
    setBuyingType(packageId);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addonPackageId: packageId }) });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "Failed");
    } catch { alert("Network error"); }
    finally { setBuyingType(null); }
  };

  if (loading) {
    return (
      <div className="animate-fade-in pt-8 lg:pt-0">
        <div className="h-8 w-48 rounded-lg bg-white/[0.06] animate-pulse mb-8" />
        <div className="glass-card h-48 animate-pulse mb-6" />
        <div className="glass-card h-64 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Billing / Subskrypcja</h1>
        <p className="mt-1 text-sm text-white/40">Manage payments, invoices, licenses, and subscription</p>
      </div>

      {/* ━━━ Current Subscription ━━━ */}
      {sub ? (
        <div className="glass-card overflow-hidden mb-6">
          <div className="border-b border-white/[0.05] px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Current Subscription</p>
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-xl">
                  {sub.product?.paymentType === "subscription" ? "🔄" : "💳"}
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-white">{sub.product?.name || sub.plan}</h2>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusColors[sub.status] || "bg-white/[0.06] text-white/40"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${sub.status === "active" ? "bg-emerald-400" : sub.status === "past_due" ? "bg-amber-400" : "bg-red-400"}`} />
                      {sub.status}
                    </span>
                    {sub.product?.priceCents && (
                      <span className="text-sm font-semibold text-white/60">${(sub.product.priceCents / 100).toFixed(2)}/mo</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-white/[0.05]">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/25 mb-1">Next Renewal</p>
                <p className="text-sm font-medium text-white/70">{sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</p>
                {sub.cancelAt && <p className="text-[11px] text-red-400 mt-0.5">Cancels on {new Date(sub.cancelAt).toLocaleDateString()}</p>}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/25 mb-1">License</p>
                {sub.license ? (
                  <code className="font-mono text-xs text-[#5f83f4]">{sub.license.key}</code>
                ) : <p className="text-xs text-white/30">—</p>}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/25 mb-1">License Expires</p>
                <p className="text-sm text-white/60">{sub.license?.expiresAt ? new Date(sub.license.expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card p-6 mb-6 text-center">
          <p className="text-sm text-white/30">No active subscription. Visit the <a href="/client/subscriptions" className="text-[#5f83f4] hover:underline">Subscriptions</a> page to purchase a plan.</p>
        </div>
      )}


      <div className="glass-card overflow-hidden mb-6">
        <div className="border-b border-white/[0.05] px-6 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Assigned Licenses</p>
        </div>
        <div className="p-6">
          {assignedLicenses.length === 0 ? (
            <p className="text-sm text-white/30">No licenses assigned to this account yet.</p>
          ) : (
            <div className="space-y-3">
              {assignedLicenses.map((license) => (
                <div key={license.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <code className="font-mono text-xs text-[#5f83f4]">{license.key}</code>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[license.status] || "bg-white/[0.06] text-white/40"}`}>{license.status}</span>
                  </div>
                  <p className="mt-2 text-xs text-white/50">Plan: {license.plan} • Domain: {license.domain}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* ━━━ Stripe Portal ━━━ */}
      <div className="glass-card overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 text-xl">💳</div>
            <div className="flex-1">
              <h2 className="font-display text-base font-semibold text-white">Manage Subscription</h2>
              <p className="mt-1 text-sm text-white/40 leading-relaxed">Update payment method, view invoices, change plan, or cancel — all in one place.</p>
              <div className="mt-4 flex items-center gap-3">
                <button onClick={openPortal} disabled={portalLoading} className="btn-primary">
                  {portalLoading ? (
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                      Zarządzaj płatnością
                    </>
                  )}
                </button>
                <span className="text-[11px] text-white/20">Stripe billing portal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ Payment History ━━━ */}
      {invoices.length > 0 && (
        <div className="mb-6">
          <h2 className="font-display text-lg font-semibold text-white mb-4">Payment History</h2>
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Date</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Amount</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Status</th>
                  <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-white/30">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-sm text-white/60">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4"><span className="font-mono text-sm font-semibold text-white/80">${inv.amount.toFixed(2)}</span></td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusColors[inv.status] || "bg-white/[0.06] text-white/40"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${inv.status === "paid" ? "bg-emerald-400" : "bg-amber-400"}`} />
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {inv.url ? (
                        <a href={inv.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#5f83f4] hover:underline">View →</a>
                      ) : <span className="text-xs text-white/20">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ━━━ Addons ━━━ */}
      <h2 className="font-display text-lg font-semibold text-white mb-4">Dodatki</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {smsPackages.map((p) => (
          <div key={p.id} className="glass-card p-6 hover:border-white/[0.12] transition-all duration-300">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-base font-semibold text-white">{p.name}</h3>
                <p className="mt-1 text-xs text-white/40">Pakiet SMS</p>
                <p className="mt-1 text-sm text-emerald-400">{p.amount} zł</p>
              </div>
              <button onClick={() => buyAddon(p.id)} disabled={buyingType === p.id} className="btn-ghost px-4 py-2 text-xs">
                {buyingType === p.id ? "Trwa..." : "Kup"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Purchased addons table */}
      {addons.length > 0 && (
        <>
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
                {addons.map((a) => (
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
        </>
      )}
    </div>
  );
}
