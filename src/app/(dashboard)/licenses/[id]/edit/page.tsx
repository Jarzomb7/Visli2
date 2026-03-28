"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Product {
  id: number;
  name: string;
  code: string;
}

export default function EditLicensePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [domain, setDomain] = useState("");
  const [plan, setPlan] = useState<"basic" | "pro">("basic");
  const [status, setStatus] = useState<"active" | "expired" | "suspended">("active");
  const [expiresAt, setExpiresAt] = useState("");
  const [productId, setProductId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/licenses/${id}`).then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ])
      .then(([licData, prodData]) => {
        if (licData.license) {
          setLicenseKey(licData.license.key);
          setDomain(licData.license.domain);
          setPlan(licData.license.plan);
          setStatus(licData.license.status);
          setExpiresAt(licData.license.expiresAt.split("T")[0]);
          setProductId(licData.license.product?.id || null);
        }
        if (prodData.products) {
          setProducts(prodData.products);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/licenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, plan, status, expiresAt: new Date(expiresAt).toISOString(), productId }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Failed"); return; }
      router.push("/licenses");
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="pt-8 lg:pt-0"><div className="h-8 w-48 rounded-lg bg-white/[0.06] animate-pulse mb-8" /><div className="glass-card h-96 animate-pulse" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0">
        <Link href="/licenses" className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          Back
        </Link>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Edit License</h1>
        <p className="mt-1"><code className="font-mono text-sm text-[#5f83f4]">{licenseKey}</code></p>
      </div>

      <div className="glass-card w-full max-w-lg p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/30">Domain</label>
            <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} className="glass-input" required />
          </div>

          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-white/30">Product</label>
            <div className="grid grid-cols-2 gap-3">
              {products.map((p) => (
                <button key={p.id} type="button" onClick={() => setProductId(p.id)}
                  className={`rounded-xl border p-4 text-left transition-all ${productId === p.id ? "border-violet-500/50 bg-violet-500/10" : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"}`}>
                  <p className={`text-sm font-semibold ${productId === p.id ? "text-violet-400" : "text-white/50"}`}>{p.name}</p>
                  <p className="mt-0.5 text-[11px] text-white/25 font-mono">{p.code}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-white/30">Plan</label>
            <div className="grid grid-cols-2 gap-3">
              {(["basic", "pro"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPlan(p)}
                  className={`rounded-xl border p-4 text-left transition-all ${plan === p ? "border-[#3b5eee]/50 bg-[#3b5eee]/10" : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"}`}>
                  <p className={`text-sm font-semibold uppercase ${plan === p ? "text-[#5f83f4]" : "text-white/50"}`}>{p}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-white/30">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(["active", "expired", "suspended"] as const).map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`rounded-xl border px-3 py-2.5 text-center text-sm font-medium capitalize transition-all ${
                    status === s
                      ? s === "active" ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                        : s === "expired" ? "border-red-500/50 bg-red-500/10 text-red-400"
                        : "border-amber-500/50 bg-amber-500/10 text-amber-400"
                      : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/[0.12]"
                  }`}>{s}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/30">Expires At</label>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="glass-input" required />
          </div>

          <div className="flex gap-3 pt-2">
            <Link href="/licenses" className="btn-ghost flex-1 text-center">Cancel</Link>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
