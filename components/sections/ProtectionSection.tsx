import Link from "next/link";
import { Scale, ShieldCheck, ShieldAlert, ArrowRight } from "lucide-react";

// Visual pattern matches ServicesSection.tsx's existing 3-col card-dark grid exactly (same
// classes, same hover treatment) -- no new CSS introduced for this section.
const CARDS = [
  {
    icon: Scale,
    title: "Know the Real Price",
    desc: "Paste in any listing's asking price and get an instant, honest verdict against live market rates — fair, overpriced, or underpriced.",
    href: "/price-check",
    iconBg: "bg-blue-50",
    iconColor: "#3b82f6",
  },
  {
    icon: ShieldCheck,
    title: "Verify It's RERA-Real",
    desc: "Every RERA number should check out on the official government source. We point you straight to the real portal for your state — no guessing.",
    href: "/legal-shield#rera-verification",
    iconBg: "bg-green-50",
    iconColor: "#22c55e",
  },
  {
    icon: ShieldAlert,
    title: "Buy Without Fear",
    desc: "Enter what a seller or broker told you and get a plain-language red-flag check for common Indian real estate scam signals before you commit.",
    href: "/legal-shield#fraud-checker",
    iconBg: "bg-yellow-50",
    iconColor: "#8a6a2e",
  },
];

export default function ProtectionSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "var(--gold-text)" }}>How PropKnown Protects You</p>
          <h2 className="heading-h2">
            The Truth, <span className="gold-text">Before You Commit</span>
          </h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            Three free checks that protect buyers — not the sellers who&apos;d rather you skip them.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CARDS.map((c) => (
            <Link key={c.href} href={c.href} className="card-dark p-6 group block">
              <div className={`w-12 h-12 rounded-xl ${c.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <c.icon size={22} style={{ color: c.iconColor }} />
              </div>
              <h3 className="heading-h3 mb-2 transition-colors group-hover:text-[#7A5C1A]">
                {c.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">{c.desc}</p>
              <span className="btn-tertiary">
                Try it free <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
