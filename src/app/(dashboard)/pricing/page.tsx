"use client";

import { useCallback, useEffect, useState } from "react";

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
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "", priceMonthly: "", stripePriceId: "", featuresText: "" });

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/plans").then((r) => r.json()).then((d) => setPlans(d.plans || [])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const reset = () => {
    setEditId(null);
    setForm({ name: "", description: "", priceMonthly: "", stripePriceId: "", featuresText: "" });
  };

  const save = async () => {
    setSaving(true);
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
    if (res.ok) {
      reset();
      load();
    }
    setSaving(false);
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
    await fetch("/api/plans", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  };

  const toggle = async (plan: Plan) => {
    await fetch("/api/plans", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: plan.id, isActive: !plan.isActive }) });
    load();
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">Plany / Pricing</h1>
          <p className="mt-1 text-sm text-white/40">Zarządzanie planami i cennikiem</p>
        </div>
      </div>

      <div className="glass-card p-6 mb-6">
        <h2 className="font-display text-base font-semibold text-white mb-4">{editId ? "Edytuj plan" : "Nowy plan"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input className="glass-input w-full" placeholder="Nazwa" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="glass-input w-full" placeholder="Cena miesięczna (np. 49)" type="number" value={form.priceMonthly} onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })} />
          <input className="glass-input w-full sm:col-span-2" placeholder="Opis" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="glass-input w-full sm:col-span-2 font-mono" placeholder="Stripe price_id" value={form.stripePriceId} onChange={(e) => setForm({ ...form, stripePriceId: e.target.value })} />
          <textarea className="glass-input w-full sm:col-span-2 min-h-[120px]" placeholder="Features (jedna linia = jedna cecha)" value={form.featuresText} onChange={(e) => setForm({ ...form, featuresText: e.target.value })} />
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Zapisywanie..." : editId ? "Zapisz" : "Utwórz"}</button>
          {editId && <button onClick={reset} className="btn-ghost">Anuluj</button>}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? <div className="glass-card h-20 animate-pulse" /> : plans.map((plan) => (
          <div key={plan.id} className="glass-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-white font-semibold">{plan.name} <span className="text-emerald-400">${plan.priceMonthly}/mies.</span></p>
                <p className="text-xs text-white/40 mt-1">{plan.description}</p>
                <code className="text-[10px] text-[#5f83f4]">{plan.stripePriceId}</code>
                <ul className="mt-2 text-xs text-white/50">{(plan.features || []).map((f) => <li key={f}>• {f}</li>)}</ul>
              </div>
              <div className="flex gap-2">
                <button onClick={() => edit(plan)} className="btn-ghost px-3 py-1.5 text-xs">Edytuj</button>
                <button onClick={() => toggle(plan)} className="btn-ghost px-3 py-1.5 text-xs">{plan.isActive ? "Dezaktywuj" : "Aktywuj"}</button>
                <button onClick={() => remove(plan.id)} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-400">Usuń</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
