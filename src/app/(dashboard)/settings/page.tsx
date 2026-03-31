"use client";

import { useEffect, useState, useCallback } from "react";

interface SchemaItem { group: string; key: string; label: string; placeholder: string; }
interface SettingRow { id: number; key: string; value: string; displayValue: string; group: string; label: string | null; sensitive: boolean; }

const GROUP_META: Record<string, { title: string; desc: string; icon: string; color: string }> = {
  stripe: { title: "Stripe", desc: "Payment processing configuration", icon: "💳", color: "from-violet-500/20 to-violet-600/10" },
  google: { title: "Google", desc: "Google services integration", icon: "🔍", color: "from-red-500/20 to-red-600/10" },
  app: { title: "App", desc: "Application URLs and identity", icon: "🚀", color: "from-cyan-500/20 to-cyan-600/10" },
  email: { title: "Email", desc: "Resend email configuration", icon: "📧", color: "from-pink-500/20 to-pink-600/10" },
  analytics: { title: "Analytics", desc: "Tracking and reporting", icon: "📊", color: "from-amber-500/20 to-amber-600/10" },
  sms: { title: "SMS", desc: "SMS notifications configuration", icon: "💬", color: "from-emerald-500/20 to-emerald-600/10" },
};

const GROUP_ORDER = ["stripe", "google", "app", "email", "analytics", "sms"];

export default function SettingsPage() {
  const [schema, setSchema] = useState<SchemaItem[]>([]);
  const [saved, setSaved] = useState<Record<string, SettingRow>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [fieldMessages, setFieldMessages] = useState<Record<string, { type: "success" | "error"; text: string }>>({});
  const [activeGroup, setActiveGroup] = useState("stripe");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setSchema(d.schema || []);
        const savedMap: Record<string, SettingRow> = {};
        const valMap: Record<string, string> = {};
        for (const s of (d.settings || []) as SettingRow[]) {
          savedMap[s.key] = s;
          valMap[s.key] = s.sensitive ? s.displayValue : s.value;
        }
        setSaved(savedMap);
        setValues(valMap);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveField = async (item: SchemaItem) => {
    const val = values[item.key] || "";
    if (!val || val.includes("••••")) return;

    setSavingKey(item.key);
    setFieldMessages((prev) => {
      const next = { ...prev };
      delete next[item.key];
      return next;
    });

    try {
      const res = await fetch("/api/settings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: item.key, value: val, group: item.group }),
      });

      const data = await res.json();
      if (res.ok) {
        setFieldMessages((prev) => ({ ...prev, [item.key]: { type: "success", text: "Saved" } }));
        load();
      } else {
        setFieldMessages((prev) => ({ ...prev, [item.key]: { type: "error", text: data.error || "Failed" } }));
      }
    } catch {
      setFieldMessages((prev) => ({ ...prev, [item.key]: { type: "error", text: "Network error" } }));
    } finally {
      setSavingKey(null);
      setTimeout(() => {
        setFieldMessages((prev) => {
          const next = { ...prev };
          delete next[item.key];
          return next;
        });
      }, 3000);
    }
  };

  const handleSaveAll = async () => {
    setSavingKey("__all__");
    try {
      const groupItems = schema.filter((s) => s.group === activeGroup);
      const entries = groupItems
        .map((s) => ({ key: s.key, value: values[s.key] || "", group: s.group, label: s.label }))
        .filter((e) => e.value && !e.value.includes("••••"));

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: entries }),
      });

      const data = await res.json();
      if (res.ok) {
        setFieldMessages((prev) => ({ ...prev, __all__: { type: "success", text: `Saved ${data.saved} settings` } }));
        load();
      } else {
        setFieldMessages((prev) => ({ ...prev, __all__: { type: "error", text: data.error || "Failed" } }));
      }
    } catch {
      setFieldMessages((prev) => ({ ...prev, __all__: { type: "error", text: "Network error" } }));
    } finally {
      setSavingKey(null);
      setTimeout(() => {
        setFieldMessages((prev) => {
          const next = { ...prev };
          delete next.__all__;
          return next;
        });
      }, 4000);
    }
  };

  const groups = GROUP_ORDER.filter((g) => schema.some((s) => s.group === g));
  const activeItems = schema.filter((s) => s.group === activeGroup);
  const meta = GROUP_META[activeGroup] || { title: activeGroup, desc: "", icon: "📦", color: "from-white/10 to-white/5" };

  if (loading) {
    return (
      <div className="animate-fade-in pt-8 lg:pt-0">
        <div className="h-8 w-48 rounded-lg bg-white/[0.06] animate-pulse mb-8" />
        <div className="glass-card h-96 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-sm text-white/40">System configuration and integrations</p>
      </div>

      {/* Group tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {groups.map((g) => {
          const m = GROUP_META[g] || { title: g, icon: "📦" };
          return (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                activeGroup === g
                  ? "border-[#3b5eee]/50 bg-[#3b5eee]/10 text-[#5f83f4]"
                  : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/[0.12] hover:text-white/60"
              }`}
            >
              <span className="text-base">{m.icon}</span>
              {m.title}
            </button>
          );
        })}
      </div>

      {/* Active group card */}
      <div className="glass-card overflow-hidden">
        <div className="border-b border-white/[0.05] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${meta.color} text-lg`}>
              {meta.icon}
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-white">{meta.title}</h2>
              <p className="text-xs text-white/30">{meta.desc}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {activeItems.map((item) => {
            const existing = saved[item.key];
            const currentValue = values[item.key] || "";
            const isSensitive = existing?.sensitive;
            const isSaving = savingKey === item.key;
            const msg = fieldMessages[item.key];

            return (
              <div key={item.key} className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/30">
                    {item.label}
                  </label>
                  {existing && (
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">SAVED</span>
                  )}
                  {isSensitive && (
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">SENSITIVE</span>
                  )}
                  <code className="ml-auto hidden sm:block shrink-0 text-[10px] text-white/15 font-mono">{item.key}</code>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type={isSensitive ? "password" : "text"}
                    value={currentValue}
                    onChange={(e) => handleChange(item.key, e.target.value)}
                    className="glass-input flex-1 font-mono text-xs"
                    placeholder={item.placeholder}
                  />
                  <button
                    onClick={() => handleSaveField(item)}
                    disabled={isSaving || !currentValue || currentValue.includes("••••")}
                    className="shrink-0 flex items-center gap-1.5 rounded-lg border border-[#3b5eee]/30 bg-[#3b5eee]/10 px-3.5 py-2 text-xs font-semibold text-[#5f83f4] transition-all hover:bg-[#3b5eee]/20 hover:border-[#3b5eee]/50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    )}
                    Save
                  </button>
                </div>
                {msg && (
                  <p className={`mt-2 text-xs font-medium ${msg.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                    {msg.text}
                  </p>
                )}
              </div>
            );
          })}

          {activeItems.length === 0 && (
            <p className="py-8 text-center text-sm text-white/30">No settings in this group.</p>
          )}
        </div>

        {/* Save All button */}
        {activeItems.length > 0 && (
          <div className="border-t border-white/[0.05] px-6 py-4 flex items-center justify-between">
            <div>
              {fieldMessages.__all__ && (
                <span className={`text-xs font-medium ${fieldMessages.__all__.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                  {fieldMessages.__all__.text}
                </span>
              )}
            </div>
            <button onClick={handleSaveAll} disabled={savingKey === "__all__"} className="btn-primary px-6">
              {savingKey === "__all__" ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
              ) : "Save All Settings"}
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 glass-card p-5">
        <div className="flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div>
            <p className="text-xs font-medium text-white/50">Settings stored in the database override environment variables.</p>
            <p className="text-xs text-white/25 mt-1">Sensitive values are masked in the UI. To update a sensitive value, type the full new value and save. Leaving a masked field unchanged will not overwrite it.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
