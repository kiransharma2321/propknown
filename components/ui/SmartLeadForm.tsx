"use client";

import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";

type FormType = "buy" | "sell" | "services" | "investor";

interface SmartLeadFormProps {
  formType: FormType;
  source: string;
  propertyId?: string;
  title?: string;
  subtitle?: string;
}

const PROPERTY_TYPES = ["Apartment", "Villa", "Independent House", "Plot / Land", "Farm Land", "Commercial", "Office Space"];
const BUDGETS = ["Under ₹30 Lakhs", "₹30L – ₹60L", "₹60L – ₹1 Crore", "₹1Cr – ₹2Cr", "₹2Cr – ₹5Cr", "Above ₹5 Crore", "AED / USD (NRI)"];
const TIMELINES = ["Immediately", "Within 3 months", "3–6 months", "6–12 months", "Just exploring"];
const BUYER_TYPES = ["First-time buyer", "Upgrader", "Investor", "NRI", "End use"];
const SERVICE_TYPES = ["Property Management", "Facility Management", "Land & Plot Services", "Property Photography", "Market Valuation", "Legal Verification", "Construction", "Interior Design"];
const SELLER_TYPES = ["Ready to sell now", "Evaluating options", "Planning in 6 months"];
const LOCATIONS = ["Hyderabad – West (Gachibowli / Kokapet)", "Hyderabad – North (Kompally / Bachupally)", "Hyderabad – East (Uppal / LB Nagar)", "Hyderabad – South (Rajendra Nagar)", "Mumbai", "Bangalore", "Delhi NCR", "Dubai / UAE", "Other"];

export default function SmartLeadForm({ formType, source, propertyId, title, subtitle }: SmartLeadFormProps) {
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState("");

  const [qual, setQual] = useState({
    propertyType: "", budget: "", location: "", timeline: "",
    buyerType: "", serviceType: "", sellerStatus: "", documentsReady: "",
  });
  const [contact, setContact] = useState({ name: "", phone: "", email: "", message: "" });

  const sel = (field: string, val: string) => setQual(q => ({ ...q, [field]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.name || !contact.phone) { setError("Name and phone are required."); return; }
    setLoading(true); setError("");

    const qualText = Object.entries(qual)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" | ");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...contact, source, propertyId,
          message: [qualText, contact.message].filter(Boolean).join("\n"),
        }),
      });
      if (res.ok) setSuccess(true);
      else setError("Something went wrong. Please try again.");
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  const inp = "bg-white border border-gray-300 text-gray-900 text-sm rounded-lg px-3 py-2.5 w-full focus:outline-none focus:border-yellow-500 placeholder-gray-400 transition-colors";

  const chip = (val: string, selVal: string, setter: (v: string) => void) => (
    <button
      key={val}
      type="button"
      onClick={() => setter(val)}
      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
        selVal === val
          ? "text-black font-semibold border-yellow-500"
          : "border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800"
      }`}
      style={selVal === val ? { background: "#C9A24B", borderColor: "#C9A24B" } : {}}
    >
      {val}
    </button>
  );

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <CheckCircle size={48} style={{ color: "#8a6a2e" }} className="mb-4" />
        <h3 className="font-semibold text-xl text-gray-900 mb-2">Enquiry Received!</h3>
        <p className="text-gray-500 text-sm max-w-xs">Our team will reach out within 2 hours. You can also WhatsApp us directly.</p>
        <a
          href="https://wa.me/919701771333"
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "#25d366" }}
          target="_blank" rel="noopener noreferrer"
        >
          Chat on WhatsApp
        </a>
        <button onClick={() => { setSuccess(false); setStep(1); }} className="mt-3 text-gray-400 text-xs hover:text-gray-600 transition-colors">
          Submit another enquiry
        </button>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <div className="mb-5">
          <h3 className="text-gray-900 font-semibold text-xl" style={{ fontFamily: "Georgia, serif" }}>{title}</h3>
          {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 && (
          <div className="space-y-4">
            {/* Property Type */}
            <div>
              <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 block">Property Type</label>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPES.map(v => chip(v, qual.propertyType, val => sel("propertyType", val)))}
              </div>
            </div>

            {formType === "buy" && (
              <div>
                <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 block">Budget</label>
                <div className="flex flex-wrap gap-2">
                  {BUDGETS.map(v => chip(v, qual.budget, val => sel("budget", val)))}
                </div>
              </div>
            )}

            <div>
              <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 block">Preferred Location</label>
              <div className="flex flex-wrap gap-2">
                {LOCATIONS.map(v => chip(v, qual.location, val => sel("location", val)))}
              </div>
            </div>

            {formType === "buy" && (
              <>
                <div>
                  <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 block">Timeline</label>
                  <div className="flex flex-wrap gap-2">
                    {TIMELINES.map(v => chip(v, qual.timeline, val => sel("timeline", val)))}
                  </div>
                </div>
                <div>
                  <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 block">I am a</label>
                  <div className="flex flex-wrap gap-2">
                    {BUYER_TYPES.map(v => chip(v, qual.buyerType, val => sel("buyerType", val)))}
                  </div>
                </div>
              </>
            )}

            {formType === "services" && (
              <div>
                <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 block">Service Required</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_TYPES.map(v => chip(v, qual.serviceType, val => sel("serviceType", val)))}
                </div>
              </div>
            )}

            {formType === "sell" && (
              <>
                <div>
                  <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 block">Selling Status</label>
                  <div className="flex flex-wrap gap-2">
                    {SELLER_TYPES.map(v => chip(v, qual.sellerStatus, val => sel("sellerStatus", val)))}
                  </div>
                </div>
                <div>
                  <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 block">Documents Ready?</label>
                  <div className="flex flex-wrap gap-2">
                    {["Yes – all documents ready", "Partially ready", "Need help with documents"].map(v =>
                      chip(v, qual.documentsReady, val => sel("documentsReady", val))
                    )}
                  </div>
                </div>
              </>
            )}

            <button type="button" onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl font-bold text-black text-sm transition-all hover:opacity-90"
              style={{ background: "#C9A24B" }}>
              Next: Contact Details →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <button type="button" onClick={() => setStep(1)} className="text-gray-400 text-xs hover:text-gray-600 transition-colors">
              ← Back to requirements
            </button>

            {Object.entries(qual).filter(([, v]) => v).length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Your Requirements</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(qual).filter(([, v]) => v).map(([k, v]) => (
                    <span key={k} className="text-xs px-2 py-0.5 rounded-full border border-gray-300 text-gray-600">{v}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Full Name *</label>
                <input className={inp} placeholder="Your name" value={contact.name} onChange={e => setContact(c => ({ ...c, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Phone *</label>
                <input className={inp} placeholder="+91 XXXXX XXXXX" value={contact.phone} onChange={e => setContact(c => ({ ...c, phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Email</label>
              <input className={inp} type="email" placeholder="email@example.com" value={contact.email} onChange={e => setContact(c => ({ ...c, email: e.target.value }))} />
            </div>
            <div>
              <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Additional Notes</label>
              <textarea className={`${inp} resize-none`} rows={3} placeholder="Any specific requirements or questions?" value={contact.message} onChange={e => setContact(c => ({ ...c, message: e.target.value }))} />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-black text-sm transition-all disabled:opacity-60 hover:opacity-90"
              style={{ background: "#C9A24B" }}>
              {loading
                ? <><span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Sending...</>
                : <><Send size={15} /> Submit Enquiry</>}
            </button>

            <p className="text-center text-gray-500 text-xs">
              Or WhatsApp directly:{" "}
              <a href="https://wa.me/919701771333" target="_blank" rel="noopener noreferrer" className="font-medium hover:underline" style={{ color: "#8a6a2e" }}>
                +91 97017 71333
              </a>
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
