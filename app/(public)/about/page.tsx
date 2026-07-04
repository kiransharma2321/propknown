import type { Metadata } from "next";
import { CheckCircle, Lightbulb, Leaf, Eye, BarChart3 } from "lucide-react";
import Link from "next/link";
import { COMPANY } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About PropKnown | Pinnelli Raghu Kiran — Founder",
  description: "Founded 01 October 2023 by Pinnelli Raghu Kiran — ISB Alumni, IIM PG Diploma, BITS, 20+ years. India's first AI-powered verified real estate platform.",
};

const CREDENTIALS = ["ISB Alumni", "IIM PG Diploma", "BITS", "20+ Years Experience", "Product Management"];

const CORE_VALUES = [
  { icon: Lightbulb, title: "Innovation",     desc: "Pioneering AI tools that bring institutional-grade intelligence to every buyer and seller." },
  { icon: Leaf,      title: "Sustainability", desc: "Promoting eco-friendly real estate choices and responsible development across all markets." },
  { icon: Eye,       title: "Transparency",   desc: "Zero hidden fees. Every price, every commission, every data point is honest and verifiable." },
  { icon: BarChart3, title: "Data-Driven",    desc: "Decisions backed by real data — AI valuations, market trends, rental yields — not opinions." },
];

const GOALS = [
  { title: "Market Expansion",        desc: "Scale from 5 countries to 20+ markets by 2028 with AI-powered local intelligence." },
  { title: "Technology Innovation",   desc: "Build the world's most comprehensive real estate AI — verified listings, predictive pricing, legal safety scores." },
  { title: "Client Trust",             desc: "Deliver honest, end-to-end advisory that makes every client a long-term partner — not just a transaction." },
];

const ADVANTAGES = [
  { title: "Proprietary AI & Technology",          desc: "JARVIS — our in-house AI engine — analyses 50+ data points for every property valuation and investment score." },
  { title: "Data Analytics & Predictive Modeling", desc: "5-year market forecasts, rental yield projections, and investment scoring for any global location." },
  { title: "User-Friendly Platforms",               desc: "Clean, intuitive interface trusted by first-time buyers and seasoned investors alike." },
];

export default function AboutPage() {
  const waMsg = encodeURIComponent("Hi Raghu, I'd like to connect with you about PropKnown.");
  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "#C9A24B" }}>Our Story</p>
          <h1 className="section-heading" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            Built on Expertise. <span className="gold-text">Driven by Trust.</span>
          </h1>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            Founded 01 October 2023 · Hyderabad, India · {COMPANY.markets.join(" · ")}
          </p>
        </div>

        {/* Founder */}
        <div className="grid lg:grid-cols-2 gap-14 items-start mb-20">
          <div>
            <div
              className="w-32 h-32 rounded-full border-2 flex items-center justify-center mb-6 mx-auto lg:mx-0"
              style={{ borderColor: "#C9A24B", background: "linear-gradient(135deg,rgba(201,162,75,0.15),rgba(201,162,75,0.05))" }}
            >
              <span className="text-5xl font-bold gold-text" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>P</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-1" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
              Pinnelli Raghu Kiran
            </h2>
            <p className="font-semibold text-sm tracking-wider mb-5" style={{ color: "#C9A24B" }}>
              Founder &amp; Managing Director, PropKnown Infra Pvt Ltd
            </p>
            <div className="flex flex-wrap gap-2 mb-7">
              {CREDENTIALS.map((b) => (
                <span key={b} className="bg-gray-100 border border-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-full">{b}</span>
              ))}
            </div>
            <blockquote className="border-l-4 pl-6 py-2 mb-7" style={{ borderColor: "#C9A24B" }}>
              <p className="text-gray-700 italic text-lg leading-relaxed" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
                &ldquo;I started PropKnown to fix the two things buyers hate most — fake listings
                and spam. Every property is verified, every number comes with honest AI intelligence.
                Know. Invest. Grow.&rdquo;
              </p>
              <footer className="mt-3 text-sm font-semibold" style={{ color: "#C9A24B" }}>
                — Pinnelli Raghu Kiran, Founder
              </footer>
            </blockquote>
            <a
              href={`https://wa.me/919701771333?text=${waMsg}`}
              target="_blank" rel="noopener noreferrer"
              className="btn-gold inline-flex"
            >
              Connect with Raghu on WhatsApp
            </a>
          </div>

          <div className="space-y-4">
            {[
              { title: "The Problem He Saw",     desc: "After 20+ years in Product Management, Raghu experienced first-hand the rampant fake listings, spam calls, and information asymmetry in Indian real estate." },
              { title: "The Solution He Built",   desc: "PropKnown — India's first AI-powered, fully verified real estate platform. Every listing goes through a 10-point verification before reaching a buyer." },
              { title: "The Education Behind It", desc: "ISB Alumni | IIM PG Diploma | BITS — bringing elite management thinking and data discipline to an industry that needed it most." },
              { title: "The Vision Ahead",        desc: "Expand to 20+ global markets, build the world's most comprehensive real estate AI, and make every property decision informed, transparent, and profitable." },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-gray-50 border border-gray-200 rounded-xl p-5 hover:border-yellow-400 transition-colors shadow-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle size={18} className="shrink-0 mt-0.5" style={{ color: "#C9A24B" }} />
                  <div>
                    <p className="text-gray-900 font-semibold text-sm mb-1">{title}</p>
                    <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Core Values */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "#C9A24B" }}>What We Stand For</p>
            <h2 className="text-3xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
              Core <span className="gold-text">Values</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CORE_VALUES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:border-yellow-400 transition-colors text-center shadow-sm">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(201,162,75,0.1)" }}>
                  <Icon size={26} style={{ color: "#C9A24B" }} />
                </div>
                <h3 className="text-gray-900 font-bold text-base mb-2">{title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Goals + Advantages */}
        <div className="grid lg:grid-cols-2 gap-10 mb-20">
          <div>
            <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "#C9A24B" }}>Where We&apos;re Headed</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>Company <span className="gold-text">Goals</span></h2>
            <div className="space-y-4">
              {GOALS.map(({ title, desc }) => (
                <div key={title} className="bg-gray-50 border border-gray-200 rounded-xl p-5 hover:border-yellow-400 transition-colors shadow-sm">
                  <p className="text-gray-900 font-semibold text-sm mb-1">{title}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "#C9A24B" }}>What Makes Us Different</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>Competitive <span className="gold-text">Advantages</span></h2>
            <div className="space-y-4">
              {ADVANTAGES.map(({ title, desc }) => (
                <div key={title} className="bg-gray-50 border border-gray-200 rounded-xl p-5 hover:border-yellow-400 transition-colors shadow-sm">
                  <p className="text-gray-900 font-semibold text-sm mb-1">{title}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center mb-16 shadow-sm">
          {[
            { val: "2023",  label: "Founded" },
            { val: "Any",   label: "Location Worldwide" },
            { val: "Global",label: "Coverage" },
            { val: "20 Yrs",label: "Expertise" },
          ].map(({ val, label }) => (
            <div key={label}>
              <p className="text-3xl font-bold mb-1 gold-text" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>{val}</p>
              <p className="text-gray-500 text-sm">{label}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/contact" className="btn-gold text-lg px-10 py-4">Work With Us</Link>
        </div>
      </div>
    </div>
  );
}
