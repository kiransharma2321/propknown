import Link from "next/link";
import { Home, TrendingUp, Bot, Building2, Globe, Mic2, ArrowRight } from "lucide-react";

const SERVICES = [
  {
    icon: Home,
    title: "Buy Properties",
    desc: "Expert guidance from search to registration. RERA-verified listings with transparent pricing.",
    href: "/buy",
    iconBg: "bg-blue-50",
    iconColor: "#3b82f6",
  },
  {
    icon: TrendingUp,
    title: "Sell Property",
    desc: "Maximum value realization with our network of qualified, pre-vetted buyers across all markets.",
    href: "/sell",
    iconBg: "bg-green-50",
    iconColor: "#22c55e",
  },
  {
    icon: Bot,
    title: "AI Intelligence",
    desc: "AI-analyzed valuations from live web search, 5-year forecasts, and buy/hold/sell signals for 8+ global cities.",
    href: "/ai-intelligence",
    iconBg: "bg-yellow-50",
    iconColor: "#8a6a2e",
  },
  {
    icon: Globe,
    title: "NRI Services",
    desc: "Seamless property management and investment advisory for NRIs in USA, UAE, UK & Singapore.",
    href: "/invest",
    iconBg: "bg-purple-50",
    iconColor: "#a855f7",
  },
  {
    icon: Building2,
    title: "For Builders",
    desc: "Channel partner program, marketing, legal advisory and bulk inventory management solutions.",
    href: "/builders",
    iconBg: "bg-orange-50",
    iconColor: "#f97316",
  },
  {
    icon: Mic2,
    title: "Real Estate Podcast",
    desc: "Insights, market trends, and investment wisdom from India's leading real estate experts.",
    href: "/podcast",
    iconBg: "bg-pink-50",
    iconColor: "#ec4899",
  },
];

export default function ServicesSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "var(--gold-text)" }}>What We Offer</p>
          <h2 className="heading-h2">
            Complete Real Estate <span className="gold-text">Services</span>
          </h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            From buying your first home to building a global property portfolio — we cover every step.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((s) => (
            <Link key={s.href} href={s.href} className="card-dark p-6 group block">
              <div className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <s.icon size={22} style={{ color: s.iconColor }} />
              </div>
              <h3 className="heading-h3 mb-2 transition-colors group-hover:text-[#7A5C1A]">
                {s.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">{s.desc}</p>
              <span className="btn-tertiary">
                Learn more <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
