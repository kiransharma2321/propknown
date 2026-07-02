"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Shield, User, ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  master:  { label: "Master Admin", color: "bg-yellow-500 text-black" },
  manager: { label: "Manager",      color: "bg-blue-500 text-white" },
  agent:   { label: "Agent",        color: "bg-zinc-600 text-white" },
};

export default function AdminUsersPage() {
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState({ name: "", email: "", password: "", role: "agent" });
  const [showPw, setShowPw]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    try {
      const r = await fetch("/api/admin/users");
      if (r.status === 403) { setError("Only Master Admin can manage users."); return; }
      const d = await r.json() as AdminUser[];
      setUsers(d);
    } catch { setError("Failed to load users"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addUser = async () => {
    if (!form.name || !form.email || !form.password) return;
    setSaving(true); setError(""); setSuccess("");
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      setSuccess(`User ${form.name} created.`);
      setForm({ name: "", email: "", password: "", role: "agent" });
      await load();
    } else {
      const d = await r.json() as { error: string };
      setError(d.error ?? "Failed");
    }
    setSaving(false);
  };

  const deactivate = async (id: string, name: string) => {
    if (!confirm(`Deactivate ${name}?`)) return;
    await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin/dashboard" className="text-zinc-400 hover:text-white"><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="text-white text-xl font-bold flex items-center gap-2"><Shield size={18} style={{ color: "#C9A24B" }} /> User Management</h1>
            <p className="text-zinc-500 text-sm">Create and manage admin team members (Master Admin only)</p>
          </div>
        </div>

        {error && <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4 mb-5 text-red-400 text-sm">{error}</div>}
        {success && <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4 mb-5 text-green-400 text-sm">{success}</div>}

        {/* Add user form */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
          <h2 className="text-white font-semibold text-sm mb-4">Add Team Member</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Full Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="John Doe" className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-600" />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="agent@propknown.com" className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-600" />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Strong password" className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 pr-9 focus:outline-none focus:border-yellow-600" />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-2 focus:outline-none">
                <option value="agent">Agent — sees assigned leads only</option>
                <option value="manager">Manager — full CRM + submissions</option>
                <option value="master">Master Admin — all permissions</option>
              </select>
            </div>
          </div>
          <button onClick={addUser} disabled={saving || !form.name || !form.email || !form.password}
            className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl text-black disabled:opacity-50"
            style={{ background: "#C9A24B" }}>
            <Plus size={14} /> {saving ? "Creating..." : "Create User"}
          </button>
        </div>

        {/* Users list */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800">
            <p className="text-white text-sm font-semibold">Team Members ({users.length})</p>
          </div>
          {loading ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Loading...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-zinc-600 text-sm">No team members yet. Create your first below.</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {users.map(u => {
                const roleInfo = ROLE_LABELS[u.role] ?? { label: u.role, color: "bg-zinc-700 text-white" };
                return (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                      <User size={14} className="text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{u.name}</p>
                      <p className="text-zinc-500 text-xs">{u.email}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${roleInfo.color}`}>{roleInfo.label}</span>
                    {!u.isActive && <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-1 rounded-full">Inactive</span>}
                    <p className="text-zinc-600 text-xs shrink-0">{new Date(u.createdAt).toLocaleDateString("en-IN")}</p>
                    {u.role !== "master" && u.isActive && (
                      <button onClick={() => deactivate(u.id, u.name)} className="text-zinc-600 hover:text-red-400 transition-colors ml-2">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-zinc-400 text-xs leading-relaxed">
            <strong className="text-zinc-300">Role Permissions:</strong><br />
            <strong>Master Admin:</strong> All access — properties, leads, CRM, submissions, user management, bulk import.<br />
            <strong>Manager:</strong> Leads, CRM, submissions, properties, bulk import. Cannot manage users.<br />
            <strong>Agent:</strong> Sees and updates only leads assigned to them via the CRM.
          </p>
        </div>
      </div>
    </div>
  );
}
