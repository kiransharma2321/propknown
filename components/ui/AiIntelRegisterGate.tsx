"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

interface Props {
  searchContext?: string;
  onUnlocked: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AiIntelRegisterGate({ searchContext, onUnlocked }: Props) {
  const [form, setForm]           = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const name  = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const phoneDigits = phone.replace(/\D/g, "");

    if (!name) { setError("Please enter your name."); return; }
    if (!EMAIL_RE.test(email)) { setError("Please enter a valid email address."); return; }
    if (phoneDigits.length < 7) { setError("Please enter a valid phone number."); return; }

    setSubmitting(true);
    try {
      const leadRes = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, phone,
          source: "ai_intelligence",
          message: searchContext
            ? `Registered after 3 free AI Intelligence searches. Was searching: ${searchContext}`
            : "Registered after 3 free AI Intelligence searches.",
        }),
      });
      if (!leadRes.ok) throw new Error("lead capture failed");

      // Best-effort -- the lead already landed in the CRM above, which is what matters most.
      await fetch("/api/ai-intelligence/unlock", { method: "POST" }).catch(() => null);

      onUnlocked();
    } catch {
      setError("Something went wrong — please try again, or WhatsApp us directly.");
      setSubmitting(false);
    }
  };

  return (
    <div className="border rounded-2xl p-6" style={{ borderColor: "rgba(201,162,75,0.4)", background: "rgba(201,162,75,0.05)" }}>
      <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(201,162,75,0.15)" }}>
        <Sparkles size={20} style={{ color: "#C9A24B" }} />
      </div>
      <p className="text-gray-900 font-bold text-center mb-1">You&apos;ve used your 3 free searches!</p>
      <p className="text-gray-500 text-sm text-center mb-5 leading-relaxed max-w-sm mx-auto">
        Register free to unlock unlimited AI market intelligence. PropKnown may reach out with
        relevant property insights — no spam, ever.
      </p>

      <form onSubmit={submit} className="space-y-3 max-w-sm mx-auto">
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Full Name *"
          className="input-dark w-full text-sm"
        />
        <input
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="Email *"
          type="email"
          className="input-dark w-full text-sm"
        />
        <input
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="Phone Number *"
          type="tel"
          className="input-dark w-full text-sm"
        />
        {error && <p className="text-red-600 text-xs text-center">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="btn-gold w-full justify-center py-3 text-sm disabled:opacity-60"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {submitting ? "Unlocking…" : "Unlock Unlimited Searches"}
        </button>
        <p className="text-[10px] text-gray-400 text-center leading-relaxed">
          Free, no password needed. Your first 3 searches were on the house.
        </p>
      </form>
    </div>
  );
}
