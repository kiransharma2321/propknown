"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Home, Trash2 } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";
import SettingsNav from "@/components/admin/SettingsNav";
import { useToast } from "@/components/ui/Toast";

interface PropertyType { id: string; name: string; active: boolean }

// Property Types (one of the 6 Settings sections whose API was built and curl-tested but had no
// UI page at all -- this is that missing UI).
export default function PropertyTypesPage() {
  const toast = useToast();
  const [items, setItems] = useState<PropertyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const r = await fetch("/api/admin/settings/property-types");
    if (r.ok) setItems((await r.json() as { propertyTypes: PropertyType[] }).propertyTypes);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const r = await fetch("/api/admin/settings/property-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    setSaving(false);
    if (r.ok) { setName(""); toast("Property type added"); await load(); }
    else toast(((await r.json()) as { error?: string }).error ?? "Failed to add", "error");
  };

  const toggleActive = async (item: PropertyType) => {
    await fetch("/api/admin/settings/property-types", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, active: !item.active }) });
    await load();
  };

  const remove = async (id: string) => {
    await fetch("/api/admin/settings/property-types", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    toast("Property type removed");
    await load();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin/settings" className="text-gray-400 hover:text-gray-900"><ArrowLeft size={18} /></Link>
          <PKLogo />
        </div>
        <h1 className="font-playfair text-gray-900 text-xl font-bold mb-1 flex items-center gap-2"><Home size={18} style={{ color: "var(--gold)" }} /> Property Types</h1>
        <p className="text-gray-500 text-sm mb-4">Manage the property type options used across the CRM.</p>
        <SettingsNav />

        <div className="flex gap-2 mb-6">
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && create()}
            placeholder="e.g. Apartment, Villa, Plot" className="input-dark text-sm px-3 py-2 flex-1" />
          <button onClick={create} disabled={saving || !name.trim()} className="btn-primary text-sm px-4 py-2 disabled:opacity-50 flex items-center gap-1.5">
            <Plus size={14} /> Add
          </button>
        </div>

        {loading ? <p className="text-gray-500 text-sm">Loading…</p> : items.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">No property types yet.</p>
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
