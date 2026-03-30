"use client";

import { useEffect, useState, useCallback } from "react";

interface Product {
  id: number;
  name: string;
  code: string;
  description: string | null;
  stripePriceId: string | null;
  paymentType: string;
  priceCents: number | null;
  active: boolean;
  createdAt: string;
  _count: { licenses: number; subscriptions: number };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "", stripePriceId: "", paymentType: "subscription", priceCents: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/products").then((r) => r.json()).then((d) => setProducts(d.products || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm({ name: "", code: "", description: "", stripePriceId: "", paymentType: "subscription", priceCents: "" }); setEditId(null); setShowForm(false); };

  const startEdit = (p: Product) => {
    setForm({ name: p.name, code: p.code, description: p.description || "", stripePriceId: p.stripePriceId || "", paymentType: p.paymentType, priceCents: p.priceCents ? String(p.priceCents) : "" });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      const method = editId ? "PUT" : "POST";
      const body = editId ? { id: editId, ...form, priceCents: form.priceCents ? parseInt(form.priceCents) : null } : { ...form, priceCents: form.priceCents ? parseInt(form.priceCents) : null };
      const res = await fetch("/api/products", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) { setMsg({ type: "success", text: editId ? "Updated" : "Created" }); resetForm(); load(); }
      else setMsg({ type: "error", text: data.error || "Failed" });
    } catch { setMsg({ type: "error", text: "Network error" }); }
    finally { setSaving(false); setTimeout(() => setMsg(null), 3000); }
  };

  const toggleActive = async (p: Product) => {
    await fetch("/api/products", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, active: !p.active }) });
    load();
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">Products</h1>
          <p className="mt-1 text-sm text-white/40">Manage products and Stripe pricing</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          New Product
        </button>
      </div>

      {msg && <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${msg.type === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-red-500/20 bg-red-500/10 text-red-400"}`}>{msg.text}</div>}

      {showForm && (
        <div className="glass-card p-6 mb-6">
          <h2 className="font-display text-base font-semibold text-white mb-4">{editId ? "Edit Product" : "New Product"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/30 mb-1.5">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="glass-input w-full" placeholder="Booking System" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/30 mb-1.5">Code</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="glass-input w-full font-mono" placeholder="BOOKING_SYSTEM" disabled={!!editId} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/30 mb-1.5">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="glass-input w-full" placeholder="Optional description" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/30 mb-1.5">Stripe Price ID</label>
              <input value={form.stripePriceId} onChange={(e) => setForm({ ...form, stripePriceId: e.target.value })} className="glass-input w-full font-mono text-xs" placeholder="price_..." />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/30 mb-1.5">Payment Type</label>
              <select value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })} className="glass-input w-full">
                <option value="subscription">Subscription (recurring)</option>
                <option value="one_time">One-time payment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/30 mb-1.5">Display Price (cents)</label>
              <input type="number" value={form.priceCents} onChange={(e) => setForm({ ...form, priceCents: e.target.value })} className="glass-input w-full font-mono" placeholder="2900 = $29.00" />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary px-6">{saving ? "Saving..." : editId ? "Update" : "Create"}</button>
            <button onClick={resetForm} className="btn-ghost px-4 py-2 text-xs">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? [...Array(3)].map((_, i) => <div key={i} className="glass-card h-20 animate-pulse" />) : products.length === 0 ? (
          <div className="glass-card px-6 py-16 text-center text-sm text-white/30">No products yet. Create your first product above.</div>
        ) : products.map((p) => (
          <div key={p.id} className="glass-card p-5 hover:border-white/[0.12] transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${p.active ? "bg-emerald-500/10" : "bg-white/[0.04]"}`}>
                  {p.paymentType === "subscription" ? "🔄" : "💳"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{p.name}</p>
                    {!p.active && <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-medium text-white/30">INACTIVE</span>}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-white/30">
                    <code className="font-mono text-white/20">{p.code}</code>
                    <span>•</span>
                    <span>{p.paymentType === "subscription" ? "Subscription" : "One-time"}</span>
                    {p.priceCents && <><span>•</span><span className="text-emerald-400">${(p.priceCents / 100).toFixed(2)}</span></>}
                    <span>•</span>
                    <span>{p._count.licenses} licenses</span>
                    <span>•</span>
                    <span>{p._count.subscriptions} subs</span>
                  </div>
                  {p.stripePriceId && <code className="mt-1 block font-mono text-[10px] text-[#5f83f4]/60">{p.stripePriceId}</code>}
                  {!p.stripePriceId && <p className="mt-1 text-[10px] text-amber-400/60">⚠ No Stripe price linked</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startEdit(p)} className="btn-ghost px-3 py-1.5 text-xs">Edit</button>
                <button onClick={() => toggleActive(p)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${p.active ? "border-red-500/20 text-red-400 hover:bg-red-500/10" : "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"}`}>
                  {p.active ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
