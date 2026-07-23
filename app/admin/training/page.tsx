"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, GraduationCap, Video, FileText, Link as LinkIcon, CheckCircle2 } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";
import { useToast } from "@/components/ui/Toast";

interface Assignment { id: string; assigneeId: string; completed: boolean }
interface TrainingItem { id: string; title: string; description: string | null; link: string; linkType: string; createdAt: string; assignments: Assignment[] }
interface AdminUserOption { id: string; name: string; email: string; isActive: boolean }

const LINK_ICON: Record<string, React.ReactNode> = { video: <Video size={14} />, document: <FileText size={14} />, other: <LinkIcon size={14} /> };

// Employee Training Tracker (new feature). Admin authors training items (link + title +
// description), assigns them to specific employees, and sees a real completion matrix -- no
// quiz/certification system, deliberately simple.
export default function AdminTrainingPage() {
  const toast = useToast();
  const [items, setItems] = useState<TrainingItem[]>([]);
  const [users, setUsers] = useState<AdminUserOption[]>([]);
  const [usersError, setUsersError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", link: "", linkType: "video" });
  const [saving, setSaving] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  const load = async () => {
    const [ir, ur] = await Promise.all([fetch("/api/admin/training-items"), fetch("/api/admin/users")]);
    if (ir.ok) setItems((await ir.json() as { items: TrainingItem[] }).items);
    if (ur.ok) setUsers((await ur.json() as AdminUserOption[]).filter(u => u.isActive));
    else setUsersError(true);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.title || !form.link) return;
    setSaving(true);
    const r = await fetch("/api/admin/training-items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (r.ok) { toast("Training item added"); setForm({ title: "", description: "", link: "", linkType: "video" }); setShowForm(false); await load(); }
    else toast("Failed to add training item", "error");
    setSaving(false);
  };

  const assign = async (itemId: string) => {
    if (selectedAssignees.length === 0) return;
    const r = await fetch(`/api/admin/training-items/${itemId}/assign`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assigneeIds: selectedAssignees }),
    });
    if (r.ok) { toast(`Assigned to ${selectedAssignees.length} employee(s)`); setAssigningId(null); setSelectedAssignees([]); await load(); }
    else toast("Assignment failed", "error");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="text-gray-400 hover:text-gray-900"><ArrowLeft size={18} /></Link>
            <PKLogo />
          </div>
          <button onClick={() => setShowForm(s => !s)} className="btn-primary text-sm px-4 py-2">
            {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? "Cancel" : "Add Training Item"}
          </button>
        </div>
        <h1 className="heading-h3 mb-1 flex items-center gap-2"><GraduationCap size={20} style={{ color: "var(--gold-text)" }} /> Employee Training</h1>
        <p className="text-gray-500 text-sm mb-6">Links + completion tracking. Not a quiz/certification system.</p>

        {usersError && (
          <p className="text-amber-700 text-xs bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            Couldn&apos;t load the team list to assign training — this action is restricted to the Master Admin account specifically (a separate, stricter check than the rest of Settings). You can still add training items below.
          </p>
        )}

        {showForm && (
          <div className="card-dark p-5 mb-6 space-y-3">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" className="input-dark text-sm px-3 py-2" />
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" rows={2} className="input-dark text-sm px-3 py-2 resize-none" />
            <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="Link (video, document, or external resource URL)" className="input-dark text-sm px-3 py-2" />
            <select value={form.linkType} onChange={e => setForm(f => ({ ...f, linkType: e.target.value }))} className="input-dark text-sm px-3 py-2">
              <option value="video">Video</option>
              <option value="document">Document</option>
              <option value="other">Other resource</option>
            </select>
            <button onClick={create} disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">{saving ? "Adding…" : "Add"}</button>
          </div>
        )}

        {loading ? <p className="text-gray-500 text-sm">Loading…</p> : items.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">No training items yet.</p>
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const completedCount = item.assignments.filter(a => a.completed).length;
              return (
                <div key={item.id} className="card-dark p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">{LINK_ICON[item.linkType] ?? LINK_ICON.other}</span>
                      <div>
                        <p className="text-gray-900 text-sm font-semibold">{item.title}</p>
                        {item.description && <p className="text-gray-500 text-xs mt-0.5">{item.description}</p>}
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="nav-link text-xs mt-1 inline-block">Open resource →</a>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">
                      {item.assignments.length === 0 ? "Not assigned" : `${completedCount}/${item.assignments.length} completed`}
                    </span>
                  </div>

                  {assigningId === item.id ? (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {users.map(u => (
                          <label key={u.id} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border border-gray-200 cursor-pointer">
                            <input type="checkbox" checked={selectedAssignees.includes(u.id)}
                              onChange={e => setSelectedAssignees(prev => e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id))} />
                            {u.name}
                          </label>
                        ))}
                        {users.length === 0 && <span className="text-gray-400 text-xs">No team members available to assign.</span>}
                      </div>
                      <button onClick={() => assign(item.id)} className="btn-primary text-xs px-3 py-1.5">Confirm Assign</button>
                    </div>
                  ) : (
                    <button onClick={() => { setAssigningId(item.id); setSelectedAssignees([]); }} className="mt-2 text-xs nav-link">+ Assign to employees</button>
                  )}

                  {item.assignments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.assignments.map(a => (
                        <span key={a.id} className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${a.completed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {a.completed && <CheckCircle2 size={9} />} {users.find(u => u.id === a.assigneeId)?.name ?? a.assigneeId.slice(0, 6)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
