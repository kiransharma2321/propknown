"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useBuyer } from "@/components/buyer/BuyerProvider";

// #8a6a2e (5.02:1 on white) instead of #C9A24B (2.40:1) -- WCAG AA needs 4.5:1 for text.
const GOLD = "#8a6a2e";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/account";
  const { refreshBuyer } = useBuyer();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = mode === "login" ? "/api/buyer/login" : "/api/buyer/register";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      refreshBuyer();
      router.push(next);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-md mx-auto px-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
          {mode === "login" ? "Log in to your account" : "Create your account"}
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          {mode === "login" ? "Access your saved favorites and property alerts." : "Save favorites and get alerted on matching properties."}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block" htmlFor="login-name">Full Name</label>
              <input id="login-name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500" />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block" htmlFor="login-email">Email</label>
            <input id="login-email" required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500" />
          </div>
          {mode === "signup" && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block" htmlFor="login-phone">Phone (optional)</label>
              <input id="login-phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500" />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block" htmlFor="login-password">Password</label>
            <input id="login-password" required type="password" minLength={6} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500" />
          </div>

          {error && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm text-black transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "#C9A24B" }}>
            {loading ? "Please wait…" : mode === "login" ? "Log In" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {mode === "login" ? "New to PropKnown?" : "Already have an account?"}{" "}
          <button onClick={() => { setMode(m => m === "login" ? "signup" : "login"); setError(""); }}
            className="font-semibold" style={{ color: GOLD }}>
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>

        <p className="text-center text-xs text-gray-400 mt-8">
          <Link href="/buy" className="hover:underline">← Back to browsing properties</Link>
        </p>
      </div>
    </div>
  );
}

export default function AccountLoginPage() {
  return (
    <Suspense fallback={<div className="pt-32 pb-20 min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
