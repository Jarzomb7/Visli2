"use client";

import { useEffect, useState } from "react";

interface Entry { id: number; amount: number; type: string; date: string; }

export default function ManualRevenuePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("wdrozenie");

  const load = () => fetch("/api/manual-revenue").then((r) => r.json()).then((d) => setEntries(d.entries || []));
  useEffect(() => { load(); }, []);

  const add = async () => {
    const val = Number(amount);
    if (!val) return;
    await fetch("/api/manual-revenue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: val, type }) });
    setAmount("");
    load();
  };

  return (
    <div className="animate-fade-in pt-8 lg:pt-0">
      <h1 className="font-display text-2xl font-bold text-white mb-4">Manual Revenue</h1>
      <div className="glass-card p-4 mb-4 flex gap-3">
        <input value={type} onChange={(e) => setType(e.target.value)} className="glass-input" placeholder="Typ (np. wdrozenie)" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} className="glass-input" type="number" placeholder="Kwota" />
        <button onClick={add} className="btn-primary">Dodaj</button>
      </div>
      <div className="space-y-2">
        {entries.map((e) => <div key={e.id} className="glass-card p-3 text-sm text-white/70">{e.type} • {e.amount} • {new Date(e.date).toLocaleDateString()}</div>)}
      </div>
    </div>
  );
}
