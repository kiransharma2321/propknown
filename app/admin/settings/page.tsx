"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Megaphone, CheckCircle2, XCircle, Loader2, Save } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";

interface CredentialView {
  provider: string;
  status: string;
  lastTestedAt: string | null;
  updatedAt: string;
}

// Settings -> API Keys (Section 15 / Section D). Meta is a real, working connection tonight --
// save credentials, test them against the live Graph API, see the real result. Google Ads and
// YouTube are deliberately non-functional setup-required states: no live connection is
// attempted for those tonight, and nothing here fabricates a "connected" status for them.
export default function ApiKeysSettingsPage() {
  const [creds, setCreds]     = useState<CredentialView[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState({ pageId: "", pageAccessToken: "", appSecret: "" });
  const [saving, setSaving]   = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/settings/credentials");
      if (r.ok) {
        const d = await r.json() as { credentials: CredentialView[] };
        setCreds(d.credentials);
      }
    } catch { /* handled by empty state below */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const metaStatus = creds.find(c => c.provider === "meta");

  const save = async () => {
    if (!form.pageId || !form.pageAccessToken) return;
    setSaving(true);
    setTestResult(null);
    await fetch("/api/admin/settings/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "meta", fields: form }),
    });
    setForm({ pageId: "", pageAccessToken: "", appSecret: "" });
    setSaving(false);
    await load();
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch("/api/admin/settings/credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "meta" }),
      });
      const d = await r.json() as { ok: boolean; error?: string; pageName?: string };
      setTestResult({ ok: d.ok, message: d.ok ? `Connected — Page: "${d.pageName}"` : (d.error ?? "Connection failed") });
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : "Request failed" });
    }
    await load();
    setTesting(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--navy)" }}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin/dashboard?tab=settings" className="text-zinc-400 hover:text-white"><ArrowLeft size={18} /></Link>
          <PKLogo dark />
        </div>

        <h1 className="font-playfair text-white text-xl font-bold mb-1">API Keys — Marketing Integrations</h1>
        <p className="text-zinc-400 text-sm mb-8">Credentials are encrypted at rest. Once saved, the raw value is never displayed again.</p>

        {/* Meta / Facebook / Instagram — real, functional */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Megaphone size={18} style={{ color: "var(--gold)" }} />
              <h2 className="text-white font-semibold text-sm">Facebook / Instagram Lead Ads</h2>
            </div>
            {loading ? (
              <span className="text-xs text-zinc-500">Loading…</span>
            ) : metaStatus?.status === "connected" ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400"><CheckCircle2 size={13} /> Connected</span>
            ) : metaStatus?.status === "error" ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400"><XCircle size={13} /> Connection error</span>
            ) : (
              <span className="text-xs font-semibold text-zinc-500">Not connected</span>
            )}
          </div>

          <p className="text-zinc-500 text-xs mb-4 leading-relaxed">
            Generate a Page Access Token for your own Facebook Page via{" "}
            <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--gold)" }}>
              Graph API Explorer
            </a>{" "}
            (permissions: <code className="text-zinc-400">leads_retrieval, pages_show_list, pages_manage_ads, pages_read_engagement, ads_management</code>).
            Exchange for a long-lived token, or use a System User token from Business Manager for one that doesn&apos;t expire.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Page ID</label>
              <input value={form.pageId} onChange={e => setForm(f => ({ ...f, pageId: e.target.value }))}
                placeholder="e.g. 123456789012345" className="w-full bg-black/30 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#D6A63E]" />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">App Secret (optional, for webhook signature verification)</label>
              <input type="password" value={form.appSecret} onChange={e => setForm(f => ({ ...f, appSecret: e.target.value }))}
                placeholder="App Secret" className="w-full bg-black/30 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#D6A63E]" />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-zinc-400 text-xs mb-1 block">Page Access Token</label>
            <input type="password" value={form.pageAccessToken} onChange={e => setForm(f => ({ ...f, pageAccessToken: e.target.value }))}
              placeholder="Paste the token generated in Graph API Explorer" className="w-full bg-black/30 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#D6A63E]" />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={save} disabled={saving || !form.pageId || !form.pageAccessToken}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
              <Save size={14} /> {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={test} disabled={testing || !metaStatus}
              className="text-sm px-4 py-2 rounded-lg border border-white/20 text-white hover:border-[#D6A63E] disabled:opacity-40 flex items-center gap-1.5">
              {testing ? <Loader2 size={14} className="animate-spin" /> : null} {testing ? "Testing…" : "Test Connection"}
            </button>
          </div>

          {testResult && (
            <p className={`text-xs mt-3 ${testResult.ok ? "text-green-400" : "text-red-400"}`}>{testResult.message}</p>
          )}

          <p className="text-zinc-600 text-[11px] mt-4 leading-relaxed">
            Once connected, point your Meta App&apos;s webhook subscription (field: <code>leadgen</code>) at{" "}
            <code className="text-zinc-500">https://propknown.com/api/leads/inbound</code>, verify token set via{" "}
            <code className="text-zinc-500">META_WEBHOOK_VERIFY_TOKEN</code> in the deployment environment.
          </p>
        </div>

        {/* Google Ads — setup required, no live connection tonight */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 opacity-60">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm">Google Ads</h2>
            <span className="text-xs font-semibold text-zinc-500">Setup required</span>
          </div>
          <p className="text-zinc-500 text-xs mt-2">
            Needs a separate Google Ads developer token application and OAuth client, approved independently by Google. Not connected tonight — this is a placeholder slot, not a live integration.
          </p>
          <button disabled className="mt-3 text-sm px-4 py-2 rounded-lg border border-white/10 text-zinc-500 cursor-not-allowed">
            Connect Google Ads
          </button>
        </div>

        {/* YouTube — setup required, no live connection tonight */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 opacity-60">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm">YouTube</h2>
            <span className="text-xs font-semibold text-zinc-500">Setup required</span>
          </div>
          <p className="text-zinc-500 text-xs mt-2">
            Needs its own Google Cloud OAuth consent screen and API approval. Not connected tonight — placeholder slot only.
          </p>
          <button disabled className="mt-3 text-sm px-4 py-2 rounded-lg border border-white/10 text-zinc-500 cursor-not-allowed">
            Connect YouTube
          </button>
        </div>
      </div>
    </div>
  );
}
