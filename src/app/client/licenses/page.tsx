"use client";

import { useEffect, useState, useCallback } from "react";

interface License {
  id: number; key: string; domain: string; domainLocked: boolean; status: string; plan: string; features: string[]; expiresAt: string;
  product: { name: string; code: string } | null;
}

export default function ClientLicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/client/licenses").then((r) => r.json()).then((d) => setLicenses(d.licenses || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDomainSave = async (id: number) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/client/licenses/${id}/domain`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: domainInput }) });
      const data = await res.json();
      if (res.ok) { setEditId(null); setDomainInput(""); load(); } else { alert(data.error || "Failed"); }
    } catch { alert("Network error"); }
    finally { setSaving(false); }
  };

  const copyKey = (key: string, id: number) => {
    navigator.clipboard.writeText(key);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Licenses</h1>
        <p className="mt-1 text-sm text-white/40">Your license keys and domain assignments</p>
      </div>

      <div className="space-y-4">
        {loading ? [1,2].map((i) => <div key={i} className="glass-card h-48 animate-pulse" />) : licenses.length === 0 ? (
          <div className="glass-card px-6 py-16 text-center text-sm text-white/30">No licenses yet. Purchase a subscription to get started.</div>
        ) : licenses.map((l) => (
          <div key={l.id} className="glass-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-400">{l.product?.name || "—"}</span>
                  <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-white/50 uppercase">{l.plan}</span>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${l.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${l.status === "active" ? "bg-emerald-400" : "bg-red-400"}`} />{l.status}
              </span>
            </div>

            {/* License key */}
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-wider text-white/25 mb-1.5">License Key</p>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm text-[#5f83f4] select-all break-all flex-1">{l.key}</code>
                <button onClick={() => copyKey(l.key, l.id)} className="shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white/50 hover:text-white/80 transition-colors">
                  {copied === l.id ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Domain */}
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-wider text-white/25 mb-1.5">Domain</p>
              {editId === l.id ? (
                <div className="flex items-center gap-2">
                  <input type="text" value={domainInput} onChange={(e) => setDomainInput(e.target.value)} className="glass-input flex-1" placeholder="yourdomain.com" />
                  <button onClick={() => handleDomainSave(l.id)} disabled={saving} className="btn-primary px-4 py-2.5 text-xs">{saving ? "..." : "Save"}</button>
                  <button onClick={() => { setEditId(null); setDomainInput(""); }} className="btn-ghost px-3 py-2.5 text-xs">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${l.domain === "PENDING" ? "text-amber-400" : "text-white/60"}`}>
                    {l.domain === "PENDING" ? "Not set — assign your domain" : l.domain}
                  </span>
                  {(l.domain === "PENDING" || l.domain === "") && (
                    <button onClick={() => { setEditId(l.id); setDomainInput(""); }} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-all">
                      Set Domain
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Features + Expiry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/[0.05]">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/25 mb-1.5">Expires</p>
                <p className="text-sm text-white/50">{new Date(l.expiresAt).toLocaleDateString()}</p>
              </div>
              {l.features.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/25 mb-1.5">Features</p>
                  <div className="flex flex-wrap gap-1">
                    {l.features.map((f) => (
                      <span key={f} className="rounded bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/40">{f}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
