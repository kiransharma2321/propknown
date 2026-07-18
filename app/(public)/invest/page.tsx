import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, Globe, Shield, BarChart3, ArrowRight } from "lucide-react";
import LeadForm from "@/components/ui/LeadForm";

export const metadata: Metadata = {
  title: "Invest — Real Estate Investment Advisory",
  description: "Curated, AI-scored, RERA-verified real estate investment opportunities in Hyderabad, Bangalore, Dubai & Singapore. NRI-friendly, expert-guided, transparent ROI.",
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
          <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "var(--gold-text)" }}>Grow Your Wealth</p>
          <h1 className="heading-h1 mb-4">
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
            <div key={title} className="card-dark bg-gray-50 p-5 text-center">
              <Icon size={28} className="mx-auto mb-3" style={{ color: "var(--gold-text)" }} />
              <h3 className="heading-h3 mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Markets */}
        <div className="mb-16">
          <h2 className="heading-h2 mb-6 text-center">
            Top Investment <span className="gold-text">Markets</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {INVEST_MARKETS.map((m) => (
              <div key={m.city} className="card-dark p-5 group">
                <div className="text-3xl mb-3">{m.flag}</div>
                <h3 className="heading-h3 mb-1 transition-colors group-hover:text-[#7A5C1A]">{m.city}</h3>
                <p className="font-bold text-sm mb-2" style={{ color: "var(--gold-text)" }}>{m.roi}</p>
                <p className="text-gray-500 text-sm">{m.type}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="heading-h2 mb-4">
              Start Your Investment <span className="gold-text">Journey</span>
            </h2>
            <p className="text-gray-500 mb-6 leading-relaxed">Tell us your investment goals and budget. We&apos;ll curate the best options within 24 hours.</p>
            <Link href="/ai-intelligence" className="btn-secondary">
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
