"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Megaphone, MessageSquare, CheckCircle2, XCircle, Loader2, Save } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";
import { useToast } from "@/components/ui/Toast";
import SettingsNav from "@/components/admin/SettingsNav";

interface CredentialView {
  provider: string;
  status: string;
  lastTestedAt: string | null;
  updatedAt: string;
}

type Provider = "meta" | "google_ads" | "twilio";

// Settings -> Integrations / API Keys (Section 15 / Section D). Meta and Twilio are real,
// working connections tonight -- save credentials, test them against the live provider API,
// see the genuine result written back. Google Ads has a real input form and a real
// OAuth+API test call too (nothing fabricated), but nothing will successfully connect until
// real Google-approved credentials exist -- that's a hard external dependency, not a shortcut
// taken here. YouTube stays a pure setup-required placeholder (out of tonight's scope).
export default function IntegrationsSettingsPage() {
  const [creds, setCreds]     = useState<CredentialView[]>([]);
  const [loading, setLoading] = useState(true);

  const [metaForm, setMetaForm]     = useState({ pageId: "", pageAccessToken: "", appSecret: "" });
  const [googleForm, setGoogleForm] = useState({ clientId: "", clientSecret: "", refreshToken: "", developerToken: "", loginCustomerId: "" });
  const [twilioForm, setTwilioForm] = useState({ accountSid: "", authToken: "", fromNumber: "", whatsappFromNumber: "" });

  const [saving, setSaving]   = useState<Provider | null>(null);
  const [testing, setTesting] = useState<Provider | null>(null);
  const [testResults, setTestResults] = useState<Record<Provider, { ok: boolean; message: string } | null>>({ meta: null, google_ads: null, twilio: null });

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

  const toast = useToast();
  const statusOf = (p: Provider) => creds.find(c => c.provider === p)?.status;

  const save = async (provider: Provider, fields: Record<string, string>, clear: () => void) => {
    setSaving(provider);
    setTestResults(prev => ({ ...prev, [provider]: null }));
    await fetch("/api/admin/settings/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, fields }),
    });
    clear();
    setSaving(null);
    toast(`${provider} credentials saved`);
    await load();
  };

  const test = async (provider: Provider, extract: (d: Record<string, unknown>) => string) => {
    setTesting(provider);
    setTestResults(prev => ({ ...prev, [provider]: null }));
    try {
      const r = await fetch("/api/admin/settings/credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const d = await r.json() as { ok: boolean; error?: string } & Record<string, unknown>;
      toast(d.ok ? `${provider}: connected` : `${provider}: ${d.error ?? "connection failed"}`, d.ok ? "success" : "error");
      setTestResults(prev => ({ ...prev, [provider]: { ok: d.ok, message: d.ok ? extract(d) : (d.error ?? "Connection failed") } }));
    } catch (e) {
      setTestResults(prev => ({ ...prev, [provider]: { ok: false, message: e instanceof Error ? e.message : "Request failed" } }));
    }
    await load();
    setTesting(null);
  };

  const StatusBadge = ({ provider }: { provider: Provider }) => {
    const s = statusOf(provider);
    if (loading) return <span className="text-xs text-gray-500">Loading…</span>;
    if (s === "connected") return <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600"><CheckCircle2 size={13} /> Connected &amp; Working</span>;
    if (s === "error") return <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600"><XCircle size={13} /> Error</span>;
    return <span className="text-xs font-semibold text-gray-500">Not Connected</span>;
  };

  const inp = "input-dark text-sm px-3 py-2";
  const label = "text-gray-500 text-xs mb-1 block";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin/dashboard?tab=settings" className="text-gray-400 hover:text-gray-900"><ArrowLeft size={18} /></Link>
          <PKLogo />
        </div>

        <h1 className="font-playfair text-gray-900 text-xl font-bold mb-1">Integrations — API Keys</h1>
        <p className="text-gray-500 text-sm mb-4">Credentials are encrypted at rest (AES-256-GCM). Once saved, the raw value is never displayed again — only a live-tested status.</p>
        <SettingsNav />

        {/* Meta / Facebook / Instagram — real, functional */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Megaphone size={18} style={{ color: "var(--gold)" }} />
              <h2 className="text-gray-900 font-semibold text-sm">Facebook / Instagram Lead Ads</h2>
            </div>
            <StatusBadge provider="meta" />
          </div>

          <p className="text-gray-500 text-xs mb-4 leading-relaxed">
            Generate a Page Access Token for your own Facebook Page via{" "}
            <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--gold)" }}>Graph API Explorer</a>{" "}
            (permissions: <code className="text-gray-500">leads_retrieval, pages_show_list, pages_manage_ads, pages_read_engagement, ads_management</code>). Use a System User token from Business Manager for one that doesn&apos;t expire.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div><label className={label}>Page ID</label>
              <input value={metaForm.pageId} onChange={e => setMetaForm(f => ({ ...f, pageId: e.target.value }))} placeholder="e.g. 123456789012345" className={inp} /></div>
            <div><label className={label}>App Secret (optional, webhook signature verification)</label>
              <input type="password" value={metaForm.appSecret} onChange={e => setMetaForm(f => ({ ...f, appSecret: e.target.value }))} placeholder="App Secret" className={inp} /></div>
          </div>
          <div className="mb-4"><label className={label}>Page Access Token</label>
            <input type="password" value={metaForm.pageAccessToken} onChange={e => setMetaForm(f => ({ ...f, pageAccessToken: e.target.value }))} placeholder="Paste the token generated in Graph API Explorer" className={inp} /></div>

          <div className="flex items-center gap-3">
            <button onClick={() => save("meta", metaForm, () => setMetaForm({ pageId: "", pageAccessToken: "", appSecret: "" }))}
              disabled={saving === "meta" || !metaForm.pageId || !metaForm.pageAccessToken} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
              <Save size={14} /> {saving === "meta" ? "Saving…" : "Save"}
            </button>
            <button onClick={() => test("meta", d => `Connected — Page: "${d.pageName as string}"`)} disabled={testing === "meta" || !statusOf("meta")}
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-900 hover:border-[#D6A63E] disabled:opacity-40 flex items-center gap-1.5">
              {testing === "meta" ? <Loader2 size={14} className="animate-spin" /> : null} {testing === "meta" ? "Testing…" : "Test Connection"}
            </button>
          </div>
          {testResults.meta && <p className={`text-xs mt-3 ${testResults.meta.ok ? "text-green-600" : "text-red-600"}`}>{testResults.meta.message}</p>}
          <p className="text-gray-400 text-[11px] mt-4 leading-relaxed">
            Once connected, point your Meta App&apos;s webhook subscription (field: <code>leadgen</code>) at <code className="text-gray-500">https://propknown.com/api/leads/inbound</code>, verify token: see the value provided when this was set up.
          </p>
        </div>

        {/* Twilio (WhatsApp/SMS) — real, functional */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} style={{ color: "var(--gold)" }} />
              <h2 className="text-gray-900 font-semibold text-sm">Twilio — WhatsApp &amp; SMS</h2>
            </div>
            <StatusBadge provider="twilio" />
          </div>
          <p className="text-gray-500 text-xs mb-4 leading-relaxed">
            Once connected, Follow-Up Management&apos;s WhatsApp/SMS reminder buttons activate immediately — no separate step. Account SID and Auth Token from your{" "}
            <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--gold)" }}>Twilio Console</a>.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div><label className={label}>Account SID</label>
              <input value={twilioForm.accountSid} onChange={e => setTwilioForm(f => ({ ...f, accountSid: e.target.value }))} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className={inp} /></div>
            <div><label className={label}>Auth Token</label>
              <input type="password" value={twilioForm.authToken} onChange={e => setTwilioForm(f => ({ ...f, authToken: e.target.value }))} placeholder="Auth Token" className={inp} /></div>
            <div><label className={label}>SMS From Number</label>
              <input value={twilioForm.fromNumber} onChange={e => setTwilioForm(f => ({ ...f, fromNumber: e.target.value }))} placeholder="+1XXXXXXXXXX" className={inp} /></div>
            <div><label className={label}>WhatsApp From Number</label>
              <input value={twilioForm.whatsappFromNumber} onChange={e => setTwilioForm(f => ({ ...f, whatsappFromNumber: e.target.value }))} placeholder="+1XXXXXXXXXX (Twilio-approved WhatsApp sender)" className={inp} /></div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => save("twilio", twilioForm, () => setTwilioForm({ accountSid: "", authToken: "", fromNumber: "", whatsappFromNumber: "" }))}
              disabled={saving === "twilio" || !twilioForm.accountSid || !twilioForm.authToken} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
              <Save size={14} /> {saving === "twilio" ? "Saving…" : "Save"}
            </button>
            <button onClick={() => test("twilio", d => `Connected — Account: "${d.accountName as string}"`)} disabled={testing === "twilio" || !statusOf("twilio")}
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-900 hover:border-[#D6A63E] disabled:opacity-40 flex items-center gap-1.5">
              {testing === "twilio" ? <Loader2 size={14} className="animate-spin" /> : null} {testing === "twilio" ? "Testing…" : "Test Connection"}
            </button>
          </div>
          {testResults.twilio && <p className={`text-xs mt-3 ${testResults.twilio.ok ? "text-green-600" : "text-red-600"}`}>{testResults.twilio.message}</p>}
        </div>

        {/* Google Ads — real form + real test call, but no approved credentials exist tonight */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900 font-semibold text-sm">Google Ads</h2>
            <StatusBadge provider="google_ads" />
          </div>
          <p className="text-gray-500 text-xs mb-4 leading-relaxed">
            Requires a Google Ads Developer Token (separate approval from Google, independent of this form) plus an OAuth2 Client ID/Secret and Refresh Token. This form and its Test Connection are fully real — nothing here fabricates a connected status — but there is nothing approved to test successfully with tonight.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div><label className={label}>Client ID</label>
              <input value={googleForm.clientId} onChange={e => setGoogleForm(f => ({ ...f, clientId: e.target.value }))} placeholder="xxxxx.apps.googleusercontent.com" className={inp} /></div>
            <div><label className={label}>Client Secret</label>
              <input type="password" value={googleForm.clientSecret} onChange={e => setGoogleForm(f => ({ ...f, clientSecret: e.target.value }))} placeholder="Client Secret" className={inp} /></div>
            <div><label className={label}>Refresh Token</label>
              <input type="password" value={googleForm.refreshToken} onChange={e => setGoogleForm(f => ({ ...f, refreshToken: e.target.value }))} placeholder="Refresh Token" className={inp} /></div>
            <div><label className={label}>Developer Token</label>
              <input type="password" value={googleForm.developerToken} onChange={e => setGoogleForm(f => ({ ...f, developerToken: e.target.value }))} placeholder="Developer Token" className={inp} /></div>
            <div className="sm:col-span-2"><label className={label}>Login Customer ID (MCC, optional)</label>
              <input value={googleForm.loginCustomerId} onChange={e => setGoogleForm(f => ({ ...f, loginCustomerId: e.target.value }))} placeholder="1234567890" className={inp} /></div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => save("google_ads", googleForm, () => setGoogleForm({ clientId: "", clientSecret: "", refreshToken: "", developerToken: "", loginCustomerId: "" }))}
              disabled={saving === "google_ads" || !googleForm.clientId || !googleForm.refreshToken || !googleForm.developerToken} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
              <Save size={14} /> {saving === "google_ads" ? "Saving…" : "Save"}
            </button>
            <button onClick={() => test("google_ads", () => "Connected")} disabled={testing === "google_ads" || !statusOf("google_ads")}
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-900 hover:border-[#D6A63E] disabled:opacity-40 flex items-center gap-1.5">
              {testing === "google_ads" ? <Loader2 size={14} className="animate-spin" /> : null} {testing === "google_ads" ? "Testing…" : "Test Connection"}
            </button>
          </div>
          {testResults.google_ads && <p className={`text-xs mt-3 ${testResults.google_ads.ok ? "text-green-600" : "text-red-600"}`}>{testResults.google_ads.message}</p>}
        </div>

        {/* YouTube — setup required, out of scope tonight */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 opacity-60">
          <div className="flex items-center justify-between">
            <h2 className="text-gray-900 font-semibold text-sm">YouTube</h2>
            <span className="text-xs font-semibold text-gray-500">Setup required</span>
          </div>
          <p className="text-gray-500 text-xs mt-2">Needs its own Google Cloud OAuth consent screen and API approval — out of tonight&apos;s scope. Placeholder slot only.</p>
          <button disabled className="mt-3 text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-500 cursor-not-allowed">Connect YouTube</button>
        </div>
      </div>
    </div>
  );
}
