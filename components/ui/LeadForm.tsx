"use client";

import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";

interface LeadFormProps {
  source: string;
  propertyId?: string;
  title?: string;
  subtitle?: string;
  dark?: boolean;
}

export default function LeadForm({ source, propertyId, title = "Get Expert Advice", subtitle, dark = false }: LeadFormProps) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) { setError("Name and phone are required."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source, propertyId }),
      });
      if (res.ok) { setSuccess(true); setForm({ name: "", phone: "", email: "", message: "" }); }
      else { setError("Something went wrong. Please try again."); }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = dark
    ? "input-dark"
    : "bg-white border border-gray-300 text-gray-900 placeholder-gray-400 rounded-sm px-4 py-3 w-full focus:outline-none focus:border-gold-500 transition-colors";
  const labelCls = dark ? "label-dark" : "text-gray-600 text-sm font-medium mb-1 block";

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <CheckCircle size={48} className="text-gold-400 mb-4" />
        <h3 className={`font-semibold text-xl mb-2 ${dark ? "text-white" : "text-gray-900"}`}>Thank You!</h3>
        <p className={dark ? "text-zinc-400" : "text-gray-500"}>
          We&apos;ve received your enquiry. Our team will reach out within 2 hours.
        </p>
        <button onClick={() => setSuccess(false)} className="mt-4 text-gold-400 text-sm hover:text-gold-300 transition-colors">
          Submit another enquiry
        </button>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <div className="mb-6">
          <h3 className={`font-semibold text-xl ${dark ? "text-white" : "text-gray-900"}`} style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            {title}
          </h3>
          {subtitle && <p className={`text-sm mt-1 ${dark ? "text-zinc-400" : "text-gray-500"}`}>{subtitle}</p>}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor={`leadform-name-${source}`}>Full Name *</label>
            <input
              id={`leadform-name-${source}`}
              className={inputCls}
              placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor={`leadform-phone-${source}`}>Phone *</label>
            <input
              id={`leadform-phone-${source}`}
              className={inputCls}
              placeholder="+91 XXXXX XXXXX"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor={`leadform-email-${source}`}>Email</label>
          <input
            id={`leadform-email-${source}`}
            className={inputCls}
            type="email"
            placeholder="email@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor={`leadform-message-${source}`}>Message</label>
          <textarea
            id={`leadform-message-${source}`}
            className={`${inputCls} resize-none`}
            rows={3}
            placeholder="Tell us about your requirements..."
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-60">
          {loading ? (
            <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Sending...</span>
          ) : (
            <span className="flex items-center gap-2"><Send size={16} /> Send Enquiry</span>
          )}
        </button>
      </form>
    </div>
  );
}
