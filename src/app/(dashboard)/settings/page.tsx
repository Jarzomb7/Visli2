"use client";

import { useEffect, useState, useCallback } from "react";

interface SchemaItem { group: string; key: string; label: string; placeholder: string; }
interface SettingRow { id: number; key: string; value: string; displayValue: string; group: string; label: string | null; sensitive: boolean; }

const GROUP_META: Record<string, { title: string; desc: string; icon: string; color: string }> = {
  stripe: { title: "Stripe", desc: "Payment processing configuration", icon: "💳", color: "from-violet-500/20 to-violet-600/10" },
  general: { title: "General", desc: "Application settings", icon: "⚙️", color: "from-blue-500/20 to-blue-600/10" },
  analytics: { title: "Analytics", desc: "Tracking and reporting", icon: "📊", color: "from-amber-500/20 to-amber-600/10" },
  sms: { title: "SMS", desc: "SMS notifications configuration", icon: "💬", color: "from-emerald-500/20 to-emerald-600/10" },
};

export default function SettingsPage() {
  const [schema, setSchema] = useState<SchemaItem[]>([]);
  const [saved, setSaved] = useState<Record<string, SettingRow>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
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

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
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
        setMessage({ type: "success", text: `Saved ${data.saved} settings` });
        load();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const groups = Array.from(new Set(schema.map((s) => s.group)));
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

            return (
              <div key={item.key}>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/30">
                    {item.label}
                  </label>
                  {existing && (
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">SAVED</span>
                  )}
                  {isSensitive && (
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">SENSITIVE</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type={isSensitive ? "password" : "text"}
                    value={currentValue}
                    onChange={(e) => handleChange(item.key, e.target.value)}
                    className="glass-input flex-1 font-mono text-xs"
                    placeholder={item.placeholder}
                  />
                  <code className="hidden sm:block shrink-0 text-[10px] text-white/15 font-mono">{item.key}</code>
                </div>
              </div>
            );
          })}

          {activeItems.length === 0 && (
            <p className="py-8 text-center text-sm text-white/30">No settings in this group.</p>
          )}
        </div>

        {/* Save button */}
        <div className="border-t border-white/[0.05] px-6 py-4 flex items-center justify-between">
          <div>
            {message && (
              <span className={`text-xs font-medium ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                {message.text}
              </span>
            )}
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary px-6">
            {saving ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
            ) : "Save Settings"}
          </button>
        </div>
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
