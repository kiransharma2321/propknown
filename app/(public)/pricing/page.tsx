import type { Metadata } from "next";
import { CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — Simple, Fair Real Estate Fees",
  description: "PropKnown pricing: always free for buyers, 1-2% success-only commission for sellers, custom investor plans. Transparent real estate fees, no hidden charges.",
};

const PLANS = [
  {
    name: "Buyer",
    price: "Free",
    sub: "No charges ever",
    highlight: false,
    features: [
      "Access to all verified listings",
      "AI valuation tool",
      "Expert consultation (1 session)",
      "RERA verification check",
      "Shortlist & site visit coordination",
      "Negotiation support",
    ],
    cta: "Start Searching",
    href: "/buy",
  },
  {
    name: "Seller",
    price: "1–2%",
    sub: "Commission on successful sale only",
    highlight: true,
    features: [
      "Free valuation report",
      "Professional photography",
      "Premium listing placement",
      "AI-powered buyer matching",
      "Negotiation handling",
      "Documentation support",
      "Legal clearance assistance",
      "RERA registration help",
    ],
    cta: "List Your Property",
    href: "/sell",
  },
  {
    name: "Investor",
    price: "Custom",
    sub: "Based on portfolio size",
    highlight: false,
    features: [
      "Dedicated investment advisor",
      "AI-powered portfolio analysis",
      "Global market access",
      "Priority property alerts",
      "Tax & ROI optimization",
      "NRI-specific compliance",
      "Quarterly portfolio review",
    ],
    cta: "Enquire Now",
    href: "/invest",
  },
];

export default function PricingPage() {
  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "#8a6a2e" }}>Transparent Pricing</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            Simple, <span className="gold-text">Fair Pricing</span>
          </h1>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto leading-relaxed">
            No hidden charges. No surprise fees. We only make money when you succeed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl p-7 flex flex-col shadow-sm ${
                p.highlight
                  ? "text-black border-0"
                  : "bg-white border border-gray-200 text-gray-900 hover:border-yellow-400 transition-colors"
              }`}
              style={p.highlight ? { background: "#C9A24B" } : {}}
            >
              <h2 className={`text-sm font-bold tracking-widest uppercase mb-2 ${p.highlight ? "text-black/60" : "text-gray-400"}`}>
                {p.name}
              </h2>
              <p className="text-4xl font-bold mb-1 text-gray-900" style={{ fontFamily: "var(--font-playfair, Georgia, serif)", color: p.highlight ? "#000" : undefined }}>
                {p.price}
              </p>
              <p className={`text-sm mb-6 ${p.highlight ? "text-black/60" : "text-gray-400"}`}>{p.sub}</p>

              <ul className="space-y-3 flex-1 mb-7">
                {p.features.map((f) => (
                  <li key={f} className={`flex items-start gap-2.5 text-sm ${p.highlight ? "text-black" : "text-gray-700"}`}>
                    <CheckCircle size={15} className="shrink-0 mt-0.5" style={{ color: p.highlight ? "#000" : "#8a6a2e" }} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={p.href}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                  p.highlight
                    ? "bg-black text-white hover:bg-gray-900"
                    : "text-black hover:opacity-90"
                }`}
                style={!p.highlight ? { background: "#C9A24B" } : {}}
              >
                {p.cta} <ArrowRight size={15} />
              </Link>
            </div>
          ))}
        </div>

        <p className="text-gray-400 text-xs text-center mt-8">
          All commissions include GST. Builder projects may have specific terms. Contact us for details.
        </p>
      </div>
    </div>
  );
}
