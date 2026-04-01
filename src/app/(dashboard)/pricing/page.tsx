"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface Plan {
  id: number;
  name: string;
  description: string | null;
  priceMonthly: number;
  stripePriceId: string;
  features: string[] | null;
  isActive: boolean;
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "", priceMonthly: "", stripePriceId: "", featuresText: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plans");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load plans");
      setPlans(data.plans || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activePlans = useMemo(() => plans.filter((p) => p.isActive).length, [plans]);

  const reset = () => {
    setEditId(null);
    setForm({ name: "", description: "", priceMonthly: "", stripePriceId: "", featuresText: "" });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...(editId ? { id: editId } : {}),
        name: form.name,
        description: form.description,
        priceMonthly: Number(form.priceMonthly),
        stripePriceId: form.stripePriceId,
        features: form.featuresText.split("\n").map((f) => f.trim()).filter(Boolean),
      };
      const method = editId ? "PUT" : "POST";
      const res = await fetch("/api/plans", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save plan");

      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSaving(false);
    }
  };

  const edit = (plan: Plan) => {
    setEditId(plan.id);
    setForm({
      name: plan.name,
      description: plan.description || "",
      priceMonthly: String(plan.priceMonthly),
      stripePriceId: plan.stripePriceId,
      featuresText: (plan.features || []).join("\n"),
    });
  };

  const remove = async (id: number) => {
    const res = await fetch("/api/plans", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to delete plan");
      return;
    }
    await load();
  };

  const toggle = async (plan: Plan) => {
    const res = await fetch("/api/plans", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: plan.id, isActive: !plan.isActive }) });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to update plan status");
      return;
    }
    await load();
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Plan Management</h1>
        <p className="mt-1 text-sm text-white/40">Clear pricing structure, product mapping, and activation controls.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-white/30">Total plans</p>
          <p className="mt-2 text-2xl font-semibold text-white">{plans.length}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-white/30">Active plans</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-400">{activePlans}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-white/30">Action</p>
          <p className="mt-2 text-sm text-white/70">{editId ? "Editing selected plan" : "Create a new sellable plan"}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 glass-card border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm text-red-300">{error}</p>
          <button onClick={load} className="mt-3 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10">Retry</button>
        </div>
      )}

      <div className="glass-card p-6 mb-6">
        <h2 className="font-display text-base font-semibold text-white mb-4">{editId ? "Edit plan" : "Create plan"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input className="glass-input w-full" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="glass-input w-full" placeholder="Monthly price" type="number" value={form.priceMonthly} onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })} />
          <input className="glass-input w-full sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="glass-input w-full sm:col-span-2 font-mono" placeholder="Stripe price_id" value={form.stripePriceId} onChange={(e) => setForm({ ...form, stripePriceId: e.target.value })} />
          <textarea className="glass-input w-full sm:col-span-2 min-h-[120px]" placeholder="Features (one per line)" value={form.featuresText} onChange={(e) => setForm({ ...form, featuresText: e.target.value })} />
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving..." : editId ? "Save Changes" : "Create Plan"}</button>
          {editId && <button onClick={reset} className="btn-ghost">Cancel</button>}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="glass-card h-20 animate-pulse" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="glass-card px-6 py-16 text-center text-sm text-white/35">
          No plans created yet. Add your first plan above to start selling.
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="glass-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-white font-semibold">
                    {plan.name} <span className="text-emerald-400">${plan.priceMonthly}/mo</span>
                    <span className={`ml-2 rounded-md px-2 py-0.5 text-[10px] ${plan.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.06] text-white/40"}`}>{plan.isActive ? "ACTIVE" : "INACTIVE"}</span>
                  </p>
                  <p className="text-xs text-white/40 mt-1">{plan.description || "No description"}</p>
                  <code className="text-[10px] text-[#5f83f4]">{plan.stripePriceId}</code>
                  <ul className="mt-2 text-xs text-white/50">{(plan.features || []).map((f) => <li key={f}>• {f}</li>)}</ul>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => edit(plan)} className="btn-ghost px-3 py-1.5 text-xs">Edit</button>
                  <button onClick={() => toggle(plan)} className="btn-ghost px-3 py-1.5 text-xs">{plan.isActive ? "Deactivate" : "Activate"}</button>
                  <button onClick={() => remove(plan.id)} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-400">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
