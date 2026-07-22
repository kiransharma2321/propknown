"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, Shield } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";

export default function AdminLoginPage() {
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
        body: JSON.stringify({ ...form, role: "admin" }),
      });
      if (res.ok) {
        router.push("/admin/dashboard");
      } else {
        setError("Invalid credentials. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--navy)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <PKLogo dark />
          <span className="text-[9px] tracking-[0.4em] text-zinc-500 mt-3">ADMIN PORTAL</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center">
              <Shield size={18} className="text-gold-400" />
            </div>
            <div>
              <h1 className="font-playfair text-white font-semibold">Admin Login</h1>
              <p className="text-zinc-500 text-xs">Authorised personnel only</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label-dark">Username</label>
              <input
                className="input-dark"
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label-dark">Password</label>
              <div className="relative">
                <input
                  className="input-dark pr-10"
                  type={showPw ? "text" : "password"}
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 disabled:opacity-60">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2"><Lock size={16} /> Sign In</span>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <Link href="/forgot-username" className="text-zinc-500 hover:text-gold-400 transition-colors">Forgot Username?</Link>
              <Link href="/forgot-password" className="text-zinc-500 hover:text-gold-400 transition-colors">Forgot Password?</Link>
            </div>
          </form>
        </div>

        <p className="text-center text-zinc-700 text-xs mt-6">
          PropKnown Infra Pvt Ltd · Secure Admin Portal
        </p>
      </div>
    </div>
  );
}
