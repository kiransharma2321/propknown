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
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <PKLogo />
          <span className="text-[9px] tracking-[0.4em] text-gray-400 mt-3">ADMIN PORTAL</span>
        </div>

        <div className="card-dark p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(214,166,62,0.12)", border: "1px solid rgba(214,166,62,0.4)" }}>
              <Shield size={18} style={{ color: "var(--gold-text)" }} />
            </div>
            <div>
              <h1 className="heading-h3">Admin Login</h1>
              <p className="text-gray-500 text-xs">Authorised personnel only</p>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 disabled:opacity-60">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2"><Lock size={16} /> Sign In</span>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <Link href="/forgot-username" className="nav-link">Forgot Username?</Link>
              <Link href="/forgot-password" className="nav-link">Forgot Password?</Link>
            </div>
          </form>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          PropKnown Infra Pvt Ltd · Secure Admin Portal
        </p>
      </div>
    </div>
  );
}
