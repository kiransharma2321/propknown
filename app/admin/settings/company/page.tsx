"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Save } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";
import SettingsNav from "@/components/admin/SettingsNav";
import { useToast } from "@/components/ui/Toast";

interface CompanySettings { companyName: string | null; founderName: string | null; whatsapp: string | null; email: string | null; address: string | null }

const inp = "input-dark text-sm px-3 py-2";
const label = "text-gray-500 text-xs mb-1 block";

// Company Profile (one of the 6 Settings sections whose API was built and curl-tested but had no
// UI page at all -- this is that missing UI). Single settings row, upserted.
export default function CompanySettingsPage() {
  const toast = useToast();
  const [form, setForm] = useState<CompanySettings>({ companyName: "", founderName: "", whatsapp: "", email: "", address: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/company").then(r => r.ok ? r.json() : null).then((d: { settings: CompanySettings | null } | null) => {
      if (d?.settings) setForm({
        companyName: d.settings.companyName ?? "", founderName: d.settings.founderName ?? "",
        whatsapp: d.settings.whatsapp ?? "", email: d.settings.email ?? "", address: d.settings.address ?? "",
      });
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const r = await fetch("/api/admin/settings/company", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    toast(r.ok ? "Company profile saved" : "Failed to save", r.ok ? undefined : "error");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin/settings" className="text-gray-400 hover:text-gray-900"><ArrowLeft size={18} /></Link>
          <PKLogo />
        </div>
        <h1 className="font-playfair text-gray-900 text-xl font-bold mb-1 flex items-center gap-2"><Building2 size={18} style={{ color: "var(--gold)" }} /> Company Profile</h1>
        <p className="text-gray-500 text-sm mb-4">Business details used across the CRM and admin panel.</p>
        <SettingsNav />

        {loading ? <p className="text-gray-500 text-sm">Loading…</p> : (
          <div className="card-dark p-6 space-y-3">
            <div><label className={label}>Company Name</label>
              <input value={form.companyName ?? ""} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} className={inp + " w-full"} /></div>
            <div><label className={label}>Founder</label>
              <input value={form.founderName ?? ""} onChange={e => setForm(f => ({ ...f, founderName: e.target.value }))} className={inp + " w-full"} /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className={label}>WhatsApp</label>
                <input value={form.whatsapp ?? ""} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} className={inp + " w-full"} /></div>
              <div><label className={label}>Email</label>
                <input value={form.email ?? ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp + " w-full"} /></div>
            </div>
            <div><label className={label}>Address</label>
              <textarea value={form.address ?? ""} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} className={inp + " w-full resize-none"} /></div>
            <button onClick={save} disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-50 flex items-center gap-1.5">
              <Save size={14} /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
