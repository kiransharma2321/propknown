"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, Mail, Trash2, Pencil } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";
import SettingsNav from "@/components/admin/SettingsNav";
import { useToast } from "@/components/ui/Toast";

interface EmailTemplate { id: string; name: string; subject: string; body: string }

// Email Templates (one of the 6 Settings sections whose API was built and curl-tested but had no
// UI page at all -- this is that missing UI).
export default function EmailTemplatesPage() {
  const toast = useToast();
  const [items, setItems] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", body: "" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ subject: "", body: "" });

  const load = async () => {
    const r = await fetch("/api/admin/settings/email-templates");
    if (r.ok) setItems((await r.json() as { templates: EmailTemplate[] }).templates);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) return;
    setSaving(true);
    const r = await fetch("/api/admin/settings/email-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (r.ok) { setForm({ name: "", subject: "", body: "" }); setShowForm(false); toast("Template added"); await load(); }
    else toast(((await r.json()) as { error?: string }).error ?? "Failed to add", "error");
  };

  const startEdit = (t: EmailTemplate) => { setEditingId(t.id); setEditForm({ subject: t.subject, body: t.body }); };

  const saveEdit = async (id: string) => {
    await fetch("/api/admin/settings/email-templates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...editForm }) });
    setEditingId(null);
    toast("Template updated");
    await load();
  };

  const remove = async (id: string) => {
    await fetch("/api/admin/settings/email-templates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    toast("Template removed");
    await load();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/admin/settings" className="text-gray-400 hover:text-gray-900"><ArrowLeft size={18} /></Link>
            <PKLogo />
          </div>
          <button onClick={() => setShowForm(s => !s)} className="btn-primary text-sm px-4 py-2">
            {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? "Cancel" : "New Template"}
          </button>
        </div>
        <h1 className="font-playfair text-gray-900 text-xl font-bold mb-1 flex items-center gap-2"><Mail size={18} style={{ color: "var(--gold)" }} /> Email Templates</h1>
        <p className="text-gray-500 text-sm mb-4">Reusable email templates for follow-ups and outreach.</p>
        <SettingsNav />

        {showForm && (
          <div className="card-dark p-5 mb-6 space-y-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Template name (internal)" className="input-dark text-sm px-3 py-2 w-full" />
            <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Email subject" className="input-dark text-sm px-3 py-2 w-full" />
            <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Email body" rows={5} className="input-dark text-sm px-3 py-2 w-full resize-none" />
            <button onClick={create} disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">{saving ? "Adding…" : "Add Template"}</button>
          </div>
        )}

        {loading ? <p className="text-gray-500 text-sm">Loading…</p> : items.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">No email templates yet.</p>
        ) : (
          <div className="space-y-3">
            {items.map(t => (
              <div key={t.id} className="card-dark p-4">
                <div className="flex items-start justify-between">
                  <p className="text-gray-900 text-sm font-semibold">{t.name}</p>
                  <div className="flex items-center gap-3 shrink-0">
                    <button onClick={() => startEdit(t)} className="text-gray-400 hover:text-gray-900"><Pencil size={14} /></button>
                    <button onClick={() => remove(t.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
                {editingId === t.id ? (
                  <div className="mt-2 space-y-2">
                    <input value={editForm.subject} onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))} className="input-dark text-sm px-3 py-2 w-full" />
                    <textarea value={editForm.body} onChange={e => setEditForm(f => ({ ...f, body: e.target.value }))} rows={5} className="input-dark text-sm px-3 py-2 w-full resize-none" />
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(t.id)} className="btn-primary text-xs px-3 py-1.5">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-700 hover:text-gray-900">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-500 text-xs mt-1">{t.subject}</p>
                    <p className="text-gray-400 text-xs mt-1 whitespace-pre-wrap line-clamp-3">{t.body}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
