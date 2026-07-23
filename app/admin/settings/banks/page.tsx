"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Landmark, Trash2 } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";
import SettingsNav from "@/components/admin/SettingsNav";
import { useToast } from "@/components/ui/Toast";

interface Bank { id: string; name: string; active: boolean }

// Banks (one of the 6 Settings sections whose API was built and curl-tested but had no UI page
// at all -- this is that missing UI).
export default function BanksPage() {
  const toast = useToast();
  const [items, setItems] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const r = await fetch("/api/admin/settings/banks");
    if (r.ok) setItems((await r.json() as { banks: Bank[] }).banks);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const r = await fetch("/api/admin/settings/banks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    setSaving(false);
    if (r.ok) { setName(""); toast("Bank added"); await load(); }
    else toast(((await r.json()) as { error?: string }).error ?? "Failed to add", "error");
  };

  const toggleActive = async (item: Bank) => {
    await fetch("/api/admin/settings/banks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, active: !item.active }) });
    await load();
  };

  const remove = async (id: string) => {
    await fetch("/api/admin/settings/banks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    toast("Bank removed");
    await load();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin/settings" className="text-gray-400 hover:text-gray-900"><ArrowLeft size={18} /></Link>
          <PKLogo />
        </div>
        <h1 className="font-playfair text-gray-900 text-xl font-bold mb-1 flex items-center gap-2"><Landmark size={18} style={{ color: "var(--gold)" }} /> Banks</h1>
        <p className="text-gray-500 text-sm mb-4">Manage the home-loan partner banks used across the CRM.</p>
        <SettingsNav />

        <div className="flex gap-2 mb-6">
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && create()}
            placeholder="e.g. HDFC Bank, SBI" className="input-dark text-sm px-3 py-2 flex-1" />
          <button onClick={create} disabled={saving || !name.trim()} className="btn-primary text-sm px-4 py-2 disabled:opacity-50 flex items-center gap-1.5">
            <Plus size={14} /> Add
          </button>
        </div>

        {loading ? <p className="text-gray-500 text-sm">Loading…</p> : items.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">No banks yet.</p>
        ) : (
          <div className="card-dark overflow-hidden">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0">
                <span className={`text-sm ${item.active ? "text-gray-900" : "text-gray-400 line-through"}`}>{item.name}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleActive(item)} className="text-xs nav-link">{item.active ? "Deactivate" : "Activate"}</button>
                  <button onClick={() => remove(item.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
