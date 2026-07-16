"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword]  = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [done,    setDone]    = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) { setError("This reset link is missing its token. Please request a new one."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push("/admin"), 2500);
      } else {
        setError(data.error || "Could not reset your password. Please request a new link.");
      }
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
          <span className="text-[9px] tracking-[0.4em] text-zinc-500">ACCOUNT RECOVERY</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center">
              <KeyRound size={18} className="text-gold-400" />
            </div>
            <div>
              <h1 className="font-playfair text-white font-semibold">Set New Password</h1>
              <p className="text-zinc-500 text-xs">For /admin and /crm logins</p>
            </div>
          </div>

          {done ? (
            <div className="text-center py-4">
              <CheckCircle size={32} className="text-green-500 mx-auto mb-3" />
              <p className="text-zinc-300 text-sm">Password updated. Redirecting you to log in…</p>
            </div>
          ) : !token ? (
            <div className="flex items-start gap-2 text-red-400 text-sm bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>This link is missing its reset token. Please request a new one from the <Link href="/forgot-password" className="underline">forgot password</Link> page.</span>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label-dark">New Password</label>
                <div className="relative">
                  <input
                    className="input-dark pr-10"
                    type={showPw ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label-dark">Confirm New Password</label>
                <input
                  className="input-dark"
                  type={showPw ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-red-400 text-sm bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2.5">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" /> <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 disabled:opacity-60">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Updating...
                  </span>
                ) : "Set New Password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordInner />
    </Suspense>
  );
}
