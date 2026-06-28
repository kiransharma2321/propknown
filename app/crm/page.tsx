"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, Activity } from "lucide-react";

export default function CRMLoginPage() {
  const router = useRouter();
  const [form, setForm]     = useState({ username: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role: "crm" }),
      });
      if (res.ok) router.push("/crm/dashboard");
      else setError("Invalid credentials.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <span className="text-3xl font-bold tracking-widest gold-text block mb-1" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            PROPKNOWN
          </span>
          <span className="text-[9px] tracking-[0.4em] text-zinc-500">CRM PORTAL</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center">
              <Activity size={18} className="text-gold-400" />
            </div>
            <div>
              <h1 className="text-white font-semibold">CRM Login</h1>
              <p className="text-zinc-500 text-xs">Lead management portal</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label-dark">Username</label>
              <input className="input-dark" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <label className="label-dark">Password</label>
              <div className="relative">
                <input className="input-dark pr-10" type={showPw ? "text" : "password"} placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-gold w-full justify-center py-3 disabled:opacity-60">
              {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />Signing in...</span> : <span className="flex items-center gap-2"><Lock size={16} />Sign In to CRM</span>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
