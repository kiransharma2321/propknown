"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Save } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";
import SettingsNav from "@/components/admin/SettingsNav";
import { useToast } from "@/components/ui/Toast";
import { ROLE_LABELS } from "@/lib/roles";
import { AREA_KEYS, AREA_LABELS, AREA_SHORT_LABELS, type AreaKey } from "@/lib/permissionAreas";

type Matrix = Record<string, Record<string, boolean>>;

// Permission Matrix (Master Admin only). Replaces the old hardcoded ROLE_PERMISSIONS table --
// every checkbox here is a real RolePermission row, read live by canRole() on every server-side
// check across the app (no caching, no "log back in" needed -- see Step 0 diagnostic on why
// that's safe for a low-traffic internal tool). Master's own row is locked both visually (always
// checked, disabled) and server-side (the save endpoint rejects role:"master" writes outright).
export default function PermissionMatrixPage() {
  const toast = useToast();
  const [roles, setRoles] = useState<string[]>([]);
  const [matrix, setMatrix] = useState<Matrix>({});
  const [dirty, setDirty] = useState<Map<string, boolean>>(new Map()); // key "role:area" -> new value
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const r = await fetch("/api/admin/permissions");
    if (r.status === 403) { setForbidden(true); setLoading(false); return; }
    if (r.ok) {
      const d = await r.json() as { roles: string[]; areas: AreaKey[]; matrix: Matrix };
      setRoles(d.roles);
      setMatrix(d.matrix);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const effective = (role: string, area: string): boolean => {
    const key = `${role}:${area}`;
    return dirty.has(key) ? dirty.get(key)! : (matrix[role]?.[area] ?? true);
  };

  const toggle = (role: string, area: string) => {
    if (role === "master") return;
    const key = `${role}:${area}`;
    const current = effective(role, area);
    setDirty(prev => new Map(prev).set(key, !current));
  };

  const save = async () => {
    if (dirty.size === 0) return;
    setSaving(true);
    const updates = Array.from(dirty.entries()).map(([key, allowed]) => {
      const [role, area] = key.split(":");
      return { role, area, allowed };
    });
    const r = await fetch("/api/admin/permissions", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updates }),
    });
    setSaving(false);
    if (r.ok) {
      toast(`Saved ${updates.length} permission change(s)`);
      setDirty(new Map());
      await load();
    } else {
      toast("Failed to save changes", "error");
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 p-6"><p className="text-gray-500 text-sm">Loading…</p></div>;

  if (forbidden) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto p-6">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/admin/settings" className="text-gray-400 hover:text-gray-900"><ArrowLeft size={18} /></Link>
            <PKLogo />
          </div>
          <div className="card-dark p-8 text-center">
            <Lock size={28} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-700 text-sm font-semibold">Master Admin only</p>
            <p className="text-gray-500 text-xs mt-1">The Permission Matrix controls what every role can access — only the Master Admin account can view or change it.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/admin/settings" className="text-gray-400 hover:text-gray-900"><ArrowLeft size={18} /></Link>
            <PKLogo />
          </div>
          <button onClick={save} disabled={saving || dirty.size === 0} className="btn-primary text-sm px-4 py-2 disabled:opacity-40 flex items-center gap-1.5">
            <Save size={14} /> {saving ? "Saving…" : dirty.size > 0 ? `Save ${dirty.size} Change${dirty.size === 1 ? "" : "s"}` : "Save Changes"}
          </button>
        </div>
        <h1 className="font-playfair text-gray-900 text-xl font-bold mb-1 flex items-center gap-2"><ShieldCheck size={18} style={{ color: "var(--gold)" }} /> Permission Matrix</h1>
        <p className="text-gray-500 text-sm mb-4">Check a box to grant that role access to that feature area. Master Admin&apos;s row is locked — always full access.</p>
        <SettingsNav />

        <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-white">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left text-gray-700 font-semibold z-10 min-w-[160px]">Role</th>
                {AREA_KEYS.map(area => (
                  <th key={area} title={AREA_LABELS[area]} className="border-b border-gray-200 px-2 py-2 text-gray-500 font-medium whitespace-nowrap [writing-mode:vertical-rl] rotate-180 h-32 align-bottom">
                    {AREA_SHORT_LABELS[area]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map(role => (
                <tr key={role} className={role === "master" ? "bg-amber-50/40" : "hover:bg-gray-50"}>
                  <td className="sticky left-0 bg-inherit border-r border-b border-gray-100 px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                    {ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}
                    {role === "master" && <Lock size={11} className="inline ml-1.5 text-amber-600" />}
                  </td>
                  {AREA_KEYS.map(area => {
                    const key = `${role}:${area}`;
                    const isChanged = dirty.has(key);
                    return (
                      <td key={area} className="border-b border-gray-100 px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={effective(role, area)}
                          disabled={role === "master"}
                          onChange={() => toggle(role, area)}
                          className={`w-4 h-4 accent-[#D6A63E] ${role === "master" ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${isChanged ? "ring-2 ring-offset-1 ring-amber-400 rounded" : ""}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
