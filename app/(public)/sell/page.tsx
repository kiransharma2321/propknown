import type { Metadata } from "next";
import { CheckCircle, TrendingUp, Users, Clock, ArrowDown } from "lucide-react";
import SmartLeadForm from "@/components/ui/SmartLeadForm";
import SubmissionForm from "@/components/property/SubmissionForm";

export const metadata: Metadata = {
  title: "Sell Property | PropKnown Infra Pvt Ltd — Get Maximum Value",
  description: "Sell your property with PropKnown. AI valuation, professional photography, wide buyer network. Average selling time 30 days. Transparent 1-2% commission.",
};

const STEPS = [
  { step: "01", title: "Free Valuation",      desc: "Our AI tool + expert analysis gives you an accurate market price in 24 hours." },
  { step: "02", title: "Professional Listing", desc: "Premium photography, 3D walkthrough, and targeted marketing across our network." },
  { step: "03", title: "Buyer Matching",       desc: "Wide buyer network. We match your property to qualified, pre-vetted prospects." },
  { step: "04", title: "Negotiation & Close",  desc: "Our experts handle negotiation, documentation, and registration end-to-end." },
];

export default function SellPage() {
  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        {/* Hero */}
        <div className="text-center mb-16">
          <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "#C9A24B" }}>Sell With Confidence</p>
          <h1 className="section-heading mb-4" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            Sell Your Property at <span className="gold-text">Maximum Value</span>
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            Average target timeline: 30 days. Premium pricing strategy. Properties facilitated across Hyderabad and beyond.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {[
            { icon: TrendingUp,  val: "Best",    label: "Price for your property" },
            { icon: Clock,       val: "30 Days",  label: "Target time to sell" },
            { icon: Users,       val: "Wide",    label: "Buyer network reach" },
            { icon: CheckCircle, val: "20+",     label: "Years of expertise" },
          ].map(({ icon: Icon, val, label }) => (
            <div key={label} className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center hover:border-yellow-400 transition-colors shadow-sm">
              <Icon size={24} className="mx-auto mb-3" style={{ color: "#C9A24B" }} />
              <p className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>{val}</p>
              <p className="text-gray-500 text-xs">{label}</p>
            </div>
          ))}
        </div>

        {/* Process */}
        <div className="mb-16">
          <h2 className="text-gray-900 text-2xl font-bold mb-8 text-center" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            How It <span className="gold-text">Works</span>
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

        {/* Quick Enquiry */}
        <div className="grid lg:grid-cols-2 gap-12 items-start mb-20">
          <div>
            <h2 className="text-gray-900 text-2xl font-bold mb-4" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
              Quick Enquiry
            </h2>
            <p className="text-gray-500 mb-6">Fill the form and our team will reach out within 2 hours with a free valuation consultation.</p>
            <ul className="space-y-3">
              {["Zero upfront charges", "RERA compliance handled", "Legal & documentation support", "Transparent commission only on success"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-gray-700 text-sm">
                  <CheckCircle size={16} className="shrink-0" style={{ color: "#C9A24B" }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <SmartLeadForm formType="sell" source="sell-page" title="Sell Your Property" subtitle="Our team contacts you within 2 hours with a free valuation." />
          </div>
        </div>

        {/* Submit / List Your Property */}
        <div id="submit-property">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="h-px bg-gray-200 flex-1 max-w-[80px]" />
              <ArrowDown size={16} className="text-gray-400" />
              <div className="h-px bg-gray-200 flex-1 max-w-[80px]" />
            </div>
            <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "#C9A24B" }}>List Your Property Directly</p>
            <h2 className="text-gray-900 text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
              Submit / <span className="gold-text">List Your Property</span>
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Upload your property with photos, videos, and documents. Our team reviews and lists it on the Buy page after verification.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <SubmissionForm />
          </div>
        </div>
      </div>
    </div>
  );
}
