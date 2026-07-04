import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, Globe, Shield, BarChart3, ArrowRight } from "lucide-react";
import LeadForm from "@/components/ui/LeadForm";

export const metadata: Metadata = {
  title: "Invest | PropKnown — Real Estate Investment Advisory",
  description: "Curated real estate investment in India and globally. AI-scored. RERA-verified. NRI-friendly. Hyderabad, Bangalore, Dubai, Singapore.",
};

const INVEST_MARKETS = [
  { flag: "🇮🇳", city: "Hyderabad", roi: "10–13% p.a.", type: "Tech & IT boom driving demand" },
  { flag: "🇮🇳", city: "Bangalore", roi: "11–14% p.a.", type: "Startup ecosystem, high rental yield" },
  { flag: "🇦🇪", city: "Dubai",     roi: "8–12% p.a.",  type: "Tax-free returns, high NRI demand" },
  { flag: "🇸🇬", city: "Singapore", roi: "5–7% p.a.",   type: "Stable APAC market, capital safety" },
];

export default function InvestPage() {
  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "#C9A24B" }}>Grow Your Wealth</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            Invest With <span className="gold-text">Insight, Not Guesswork</span>
          </h1>
          <p className="text-gray-500 mt-4 max-w-2xl mx-auto text-lg leading-relaxed">
            Diversify your portfolio with curated, AI-scored real estate opportunities in India and globally.
            NRI-friendly. Expert-guided.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {[
            { icon: TrendingUp, title: "AI ROI Analysis",    desc: "Every opportunity backed by data-driven return projections." },
            { icon: Globe,      title: "Global Markets",     desc: "IN, UAE, UK, USA, Singapore — curated for NRI investors." },
            { icon: Shield,     title: "RERA Verified",      desc: "Zero unverified projects. Full compliance across all markets." },
            { icon: BarChart3,  title: "Portfolio Tracking", desc: "Monitor your investments across markets in one place." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center hover:border-yellow-400 hover:shadow-md transition-colors shadow-sm">
              <Icon size={28} className="mx-auto mb-3" style={{ color: "#C9A24B" }} />
              <h3 className="text-gray-900 font-semibold mb-2 text-base">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Markets */}
        <div className="mb-16">
          <h2 className="text-gray-900 text-2xl sm:text-3xl font-bold mb-6 text-center" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            Top Investment <span className="gold-text">Markets</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {INVEST_MARKETS.map((m) => (
              <div key={m.city} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-yellow-400 hover:shadow-md transition-all group shadow-sm">
                <div className="text-3xl mb-3">{m.flag}</div>
                <h3 className="text-gray-900 font-semibold mb-1 group-hover:text-yellow-700 transition-colors text-base">{m.city}</h3>
                <p className="font-bold text-sm mb-2" style={{ color: "#C9A24B" }}>{m.roi}</p>
                <p className="text-gray-500 text-sm">{m.type}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-gray-900 text-2xl sm:text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
              Start Your Investment <span className="gold-text">Journey</span>
            </h2>
            <p className="text-gray-500 mb-6 leading-relaxed">Tell us your investment goals and budget. We&apos;ll curate the best options within 24 hours.</p>
            <Link href="/ai-intelligence" className="btn-outline-gold">
              Try AI Valuation First <ArrowRight size={16} />
            </Link>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <LeadForm source="invest" title="Investment Enquiry" subtitle="Our investment advisors will call you back." />
          </div>
        </div>
      </div>
    </div>
  );
}
