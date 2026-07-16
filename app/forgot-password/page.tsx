"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      setMessage(data.message || "If this email is registered, you'll receive a password reset email shortly.");
      setSent(true);
    } catch {
      setMessage("Something went wrong. Please try again in a moment.");
      setSent(true);
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
          <span className="text-[9px] tracking-[0.4em] text-zinc-500">ACCOUNT RECOVERY</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center">
              <Mail size={18} className="text-gold-400" />
            </div>
            <div>
              <h1 className="font-playfair text-white font-semibold">Forgot Password</h1>
              <p className="text-zinc-500 text-xs">For /admin and /crm logins</p>
            </div>
          </div>

          {sent ? (
            <div className="text-center py-4">
              <CheckCircle size={32} className="text-green-500 mx-auto mb-3" />
              <p className="text-zinc-300 text-sm leading-relaxed">{message}</p>
              <p className="text-zinc-500 text-xs mt-3">Check your inbox (and spam folder) — the link expires in 45 minutes.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label-dark">Registered Email</label>
                <input
                  type="email"
                  className="input-dark"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 disabled:opacity-60">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : "Send Reset Link"}
              </button>
            </form>
          )}

          <Link href="/admin" className="flex items-center justify-center gap-1.5 text-zinc-500 hover:text-gold-400 text-xs mt-6 transition-colors">
            <ArrowLeft size={12} /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
