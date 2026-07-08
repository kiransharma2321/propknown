"use client";

import { useState } from "react";
import { Video, MessageCircle, Loader2, CheckCircle } from "lucide-react";
import { COMPANY } from "@/lib/utils";

interface Props {
  propertyId?: string;
  title: string;
  className?: string;
}

export default function RequestVideoTourButton({ propertyId, title, className }: Props) {
  const [open, setOpen]           = useState(false);
  const [form, setForm]           = useState({ name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          message: `Requested a live video tour for "${title}"`,
          source: "nri",
          propertyId,
        }),
      });
    } catch {
      // Non-fatal — the WhatsApp fallback below still lets them reach Raghu directly
    } finally {
      setSubmitting(false);
      setDone(true);
      const waText = encodeURIComponent(`Hi PropKnown! I'd like a live video tour of "${title}". My name is ${form.name.trim()}.`);
      window.open(`https://wa.me/${COMPANY.whatsapp}?text=${waText}`, "_blank", "noopener,noreferrer");
    }
  };

  if (done) {
    return (
      <div className={`flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 ${className ?? ""}`}>
        <CheckCircle size={16} /> Request sent — Raghu will WhatsApp you to schedule the tour.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm border-2 transition-all hover:bg-gray-50 ${className ?? ""}`}
        style={{ borderColor: "rgba(201,162,75,0.5)", color: "#8a6a2e" }}
      >
        <Video size={16} /> Request Live Video Tour
      </button>
    );
  }

  return (
    <form onSubmit={submit} className={`border rounded-xl p-4 space-y-2.5 ${className ?? ""}`} style={{ borderColor: "rgba(201,162,75,0.4)" }}>
      <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <Video size={13} style={{ color: "#8a6a2e" }} /> Request a live video tour
      </p>
      <input
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        placeholder="Your Name *" required
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-yellow-400 placeholder-gray-400"
      />
      <input
        value={form.phone}
        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
        placeholder="WhatsApp Number *" required type="tel"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-yellow-400 placeholder-gray-400"
      />
      <button type="submit" disabled={submitting}
        className="w-full py-2.5 rounded-lg font-bold text-black text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
        style={{ background: "#C9A24B" }}>
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
        {submitting ? "Sending…" : "Send Request"}
      </button>
    </form>
  );
}
