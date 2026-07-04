import type { Metadata } from "next";
import { CheckCircle, TrendingUp, Users, Clock, Upload, Phone, ChevronDown } from "lucide-react";
import SmartLeadForm from "@/components/ui/SmartLeadForm";
import SubmissionForm from "@/components/property/SubmissionForm";

export const metadata: Metadata = {
  title: "Sell Property | PropKnown Infra Pvt Ltd — Get Maximum Value",
  description: "Sell your property with PropKnown. Upload photos, videos & documents for direct listing, or get free valuation + professional support. RERA-compliant.",
};

const STEPS = [
  { step: "01", title: "Free Valuation",       desc: "AI tool + expert analysis gives you an accurate market price in 24 hours." },
  { step: "02", title: "Professional Listing",  desc: "Premium photography, 3D walkthrough, and targeted marketing across our network." },
  { step: "03", title: "Buyer Matching",        desc: "Wide buyer network. We match your property to qualified, pre-vetted prospects." },
  { step: "04", title: "Negotiation & Close",   desc: "Our experts handle negotiation, documentation, and registration end-to-end." },
];

export default function SellPage() {
  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="text-center mb-12">
          <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "#C9A24B" }}>
            Sell With Confidence
          </p>
          <h1 className="section-heading mb-4" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            List With <span className="gold-text">Confidence</span>
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg mb-8">
            List your property yourself with photos &amp; documents, or let our expert team handle everything end-to-end.
          </p>

          {/* Two primary CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#submit-property"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-bold text-black text-sm transition-all hover:opacity-90 hover:shadow-lg"
              style={{ background: "#C9A24B" }}>
              <Upload size={17} />
              Upload Property with Photos &amp; Docs
              <ChevronDown size={15} />
            </a>
            <a href="#quick-enquiry"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-semibold text-gray-700 text-sm border-2 border-gray-300 hover:border-gray-500 transition-all">
              <Phone size={15} />
              Talk to Our Team
            </a>
          </div>
        </div>

        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {[
            { icon: TrendingUp,  val: "Best",    label: "Price for your property" },
            { icon: Clock,       val: "30 Days", label: "Target time to sell"     },
            { icon: Users,       val: "Wide",    label: "Buyer network reach"     },
            { icon: CheckCircle, val: "20+",     label: "Years of expertise"      },
          ].map(({ icon: Icon, val, label }) => (
            <div key={label} className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center hover:border-yellow-400 transition-colors shadow-sm">
              <Icon size={24} className="mx-auto mb-3" style={{ color: "#C9A24B" }} />
              <p className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>{val}</p>
              <p className="text-gray-500 text-xs">{label}</p>
            </div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ── PRIMARY: Submit / List Your Property (full upload form) ──────── */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div id="submit-property" className="scroll-mt-28 mb-20">
          {/* Section banner */}
          <div className="rounded-2xl p-6 sm:p-8 mb-8 text-center"
            style={{ background: "linear-gradient(135deg, rgba(201,162,75,0.12) 0%, rgba(201,162,75,0.04) 100%)", border: "2px solid rgba(201,162,75,0.4)" }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4 uppercase tracking-widest"
              style={{ background: "#C9A24B", color: "#000" }}>
              <Upload size={12} /> List Your Property Directly
            </div>
            <h2 className="text-gray-900 text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
              Submit Your Property — <span className="gold-text">Photos, Video &amp; Documents</span>
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto mb-4">
              Fill the form below to upload your property with photos (required), video (optional),
              and documents (optional, admin-only). Our team reviews and lists it on the Buy page within 24 hours.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
              {[
                "📸 Upload up to 5 photos",
                "🎬 Video: file or YouTube link",
                "📄 Property documents (private)",
                "✅ Verified & listed within 24 hrs",
              ].map(f => <span key={f}>{f}</span>)}
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            <SubmissionForm />
          </div>
        </div>

        {/* ── Divider ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-16">
          <div className="flex-1 h-px bg-gray-200" />
          <p className="text-gray-400 text-sm font-medium px-4">OR — Let Our Team Handle Everything</p>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ── SECONDARY: Quick Enquiry (agent-assisted) ────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div id="quick-enquiry" className="scroll-mt-28 grid lg:grid-cols-2 gap-12 items-start mb-20">
          <div>
            <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "#C9A24B" }}>
              Agent-Assisted Sale
            </p>
            <h2 className="text-gray-900 text-2xl font-bold mb-4" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
              Sell With PropKnown&apos;s Expert Team
            </h2>
            <p className="text-gray-500 mb-6">
              Our team handles photography, marketing, negotiation, and legal paperwork — so you get the best price
              without the hassle. Contact within 2 hours.
            </p>
            <ul className="space-y-3">
              {[
                "Zero upfront charges",
                "RERA compliance handled end-to-end",
                "Legal & documentation support",
                "Transparent commission only on success",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-gray-700 text-sm">
                  <CheckCircle size={16} className="shrink-0" style={{ color: "#C9A24B" }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <SmartLeadForm
              formType="sell"
              source="sell-page"
              title="Get a Free Valuation"
              subtitle="Our team contacts you within 2 hours with a free valuation and marketing plan."
            />
          </div>
        </div>

        {/* ── How it works (process) ─────────────────────────────────────────── */}
        <div>
          <h2 className="text-gray-900 text-2xl font-bold mb-8 text-center" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            How Agent-Assisted Sale <span className="gold-text">Works</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <div key={s.step} className="bg-gray-50 border border-gray-200 rounded-xl p-5 h-full hover:border-yellow-400 transition-colors shadow-sm">
                <p className="text-5xl font-bold mb-3" style={{ color: "rgba(201,162,75,0.25)", fontFamily: "var(--font-playfair, Georgia, serif)" }}>{s.step}</p>
                <h3 className="text-gray-900 font-semibold mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
