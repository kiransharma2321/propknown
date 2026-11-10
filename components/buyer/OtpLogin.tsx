"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

// M2: log in or sign up with a one-time code emailed to you (no password needed).
export default function OtpLogin({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inp = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500";

  const post = async (url: string, body: object) => {
    setBusy(true); setError("");
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(j.error ?? "Something went wrong."); return false; }
      return true;
    } catch { setError("Network error, please try again."); return false; }
    finally { setBusy(false); }
  };

  return step === "email" ? (
    <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await post("/api/buyer/otp/request", { email })) setStep("code"); }}>
      <div>
        <label htmlFor="otp-email" className="text-xs font-semibold text-gray-600 mb-1 block">Email</label>
        <input id="otp-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inp} autoComplete="email" />
      </div>
      <div>
        <label htmlFor="otp-name" className="text-xs font-semibold text-gray-600 mb-1 block">Your name (only needed the first time)</label>
        <input id="otp-name" value={name} onChange={(e) => setName(e.target.value)} className={inp} autoComplete="name" />
      </div>
      {error && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <button type="submit" disabled={busy} className="w-full py-3 rounded-xl font-bold text-sm text-black inline-flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: "#C9A24B" }}>
        <Mail size={15} /> {busy ? "Sending…" : "Email me a login code"}
      </button>
    </form>
  ) : (
    <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await post("/api/buyer/otp/verify", { email, code, name })) onDone(); }}>
      <p className="text-sm text-gray-600">We sent a 6-digit code to <b>{email}</b>. It expires in 10 minutes.</p>
      <div>
        <label htmlFor="otp-code" className="text-xs font-semibold text-gray-600 mb-1 block">Code</label>
        <input id="otp-code" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className={`${inp} tracking-[0.5em] text-lg`} />
      </div>
      {error && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <button type="submit" disabled={busy || code.length !== 6} className="w-full py-3 rounded-xl font-bold text-sm text-black disabled:opacity-60" style={{ background: "#C9A24B" }}>
        {busy ? "Checking…" : "Log in"}
      </button>
      <button type="button" onClick={() => { setStep("email"); setCode(""); setError(""); }} className="w-full text-xs text-gray-500 underline">Use a different email or send a new code</button>
    </form>
  );
}
