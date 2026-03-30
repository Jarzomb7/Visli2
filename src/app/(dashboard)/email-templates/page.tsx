"use client";

import { useEffect, useState, useCallback } from "react";

interface Template { id: number; slug: string; name: string; subject: string; body: string; }

const VARIABLES = [
  { name: "{{email}}", desc: "User email" },
  { name: "{{password}}", desc: "Generated password" },
  { name: "{{license_key}}", desc: "License key" },
  { name: "{{domain}}", desc: "License domain" },
  { name: "{{plan}}", desc: "Plan name" },
  { name: "{{product_name}}", desc: "Product name" },
  { name: "{{app_name}}", desc: "App name (from settings)" },
  { name: "{{app_url}}", desc: "App URL" },
  { name: "{{login_url}}", desc: "Login page URL" },
  { name: "{{reset_url}}", desc: "Password reset URL" },
];

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Template | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [tab, setTab] = useState<"editor" | "preview">("editor");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/email-templates").then((r) => r.json()).then((d) => { setTemplates(d.templates || []); }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectTemplate = (t: Template) => { setSelected(t); setSubject(t.subject); setBody(t.body); setTab("editor"); };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/email-templates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selected.id, subject, body }) });
      if (res.ok) { setMsg({ type: "success", text: "Template saved" }); load(); }
      else setMsg({ type: "error", text: "Failed to save" });
    } catch { setMsg({ type: "error", text: "Network error" }); }
    finally { setSaving(false); setTimeout(() => setMsg(null), 3000); }
  };

  const handleTest = async () => {
    if (!selected) return;
    setTesting(true); setMsg(null);
    try {
      const res = await fetch("/api/email-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test", id: selected.id }) });
      const data = await res.json();
      setMsg({ type: data.sent ? "success" : "error", text: data.sent ? "Test email sent to your admin email" : "Failed — check Resend API key in Settings" });
    } catch { setMsg({ type: "error", text: "Network error" }); }
    finally { setTesting(false); setTimeout(() => setMsg(null), 4000); }
  };

  const previewHtml = () => {
    let result = body;
    const testVars: Record<string, string> = { email: "user@example.com", password: "SecurePass123!", license_key: "VISLI-ABCD-1234-EFGH-5678", domain: "example.com", plan: "subscription", product_name: "Booking System", app_name: "VISLI", app_url: "https://visli.io", login_url: "https://visli.io/login", reset_url: "https://visli.io/reset-password?token=demo" };
    for (const [key, value] of Object.entries(testVars)) result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
    return result;
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Email Templates</h1>
        <p className="mt-1 text-sm text-white/40">Edit email templates with live preview</p>
      </div>

      {msg && <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${msg.type === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-red-500/20 bg-red-500/10 text-red-400"}`}>{msg.text}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Template list */}
        <div className="lg:col-span-1">
          <div className="glass-card overflow-hidden">
            <div className="border-b border-white/[0.05] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/30">Templates</p>
            </div>
            <div className="p-2 space-y-1">
              {loading ? [...Array(2)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-white/[0.04] animate-pulse" />) : templates.map((t) => (
                <button key={t.id} onClick={() => selectTemplate(t)} className={`w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-all ${selected?.id === t.id ? "bg-[#3b5eee]/10 text-[#5f83f4]" : "text-white/50 hover:bg-white/[0.04] hover:text-white/70"}`}>
                  <span className="text-base">{t.slug === "welcome" ? "👋" : t.slug === "password-reset" ? "🔑" : "📧"}</span>
                  <div>
                    <p className="font-medium text-xs">{t.name}</p>
                    <p className="text-[10px] text-white/20 mt-0.5">{t.slug}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Variables reference */}
          <div className="glass-card mt-4 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/30 mb-3">Variables</p>
            <div className="space-y-2">
              {VARIABLES.map((v) => (
                <div key={v.name} className="flex items-center justify-between">
                  <code className="text-[10px] font-mono text-[#5f83f4]/80">{v.name}</code>
                  <span className="text-[10px] text-white/20">{v.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Editor / Preview */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div className="glass-card px-6 py-24 text-center text-sm text-white/30">Select a template to edit</div>
          ) : (
            <div className="glass-card overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-white/[0.05] px-6 py-3 flex items-center justify-between">
                <div className="flex gap-2">
                  <button onClick={() => setTab("editor")} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${tab === "editor" ? "bg-[#3b5eee]/10 text-[#5f83f4]" : "text-white/40 hover:text-white/60"}`}>Editor</button>
                  <button onClick={() => setTab("preview")} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${tab === "preview" ? "bg-[#3b5eee]/10 text-[#5f83f4]" : "text-white/40 hover:text-white/60"}`}>Preview</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleTest} disabled={testing} className="btn-ghost px-3 py-1.5 text-xs">{testing ? "Sending..." : "Send Test"}</button>
                  <button onClick={handleSave} disabled={saving} className="btn-primary px-4 py-1.5 text-xs">{saving ? "Saving..." : "Save"}</button>
                </div>
              </div>

              {tab === "editor" ? (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-white/30 mb-1.5">Subject Line</label>
                    <input value={subject} onChange={(e) => setSubject(e.target.value)} className="glass-input w-full font-mono text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-white/30 mb-1.5">HTML Body</label>
                    <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={20} className="glass-input w-full font-mono text-xs leading-relaxed resize-y" />
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="mb-3">
                    <span className="text-xs text-white/30">Subject: </span>
                    <span className="text-xs text-white/60">{subject.replace(/{{(\w+)}}/g, (_, key) => {
                      const testVars: Record<string, string> = { app_name: "VISLI", email: "user@example.com" };
                      return testVars[key] || `{{${key}}}`;
                    })}</span>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] overflow-hidden bg-white">
                    <iframe srcDoc={previewHtml()} className="w-full min-h-[500px] border-0" title="Email Preview" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
