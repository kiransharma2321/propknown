import { Shield, Brain, Users, Globe2, BadgeCheck } from "lucide-react";

const POINTS = [
  { icon: BadgeCheck, title: "No Fake Listings",           desc: "Every property verified before listing. 10-point approval checklist — title deed, owner consent, real photos, accurate price." },
  { icon: Shield,     title: "No Broker Spam",             desc: "Direct owner and builder contact only. No middlemen, no spam calls, no pressure tactics — ever." },
  { icon: Brain,      title: "AI Pricing Transparency",    desc: "AI-powered valuations for any location worldwide. Honest data, not broker word of mouth." },
  { icon: BadgeCheck, title: "RERA Verified + Legal Score",desc: "All listings carry RERA / HMDA badge and an AI-powered legal safety score before going live." },
  { icon: Globe2,     title: "India + Global Markets",     desc: "Hyderabad HQ with active markets in USA, UAE, UK, Singapore and expanding globally." },
  { icon: Users,      title: "20+ Years Expertise",        desc: "Founded by Pinnelli Raghu Kiran — ISB, IIM, BITS — with two decades in product management and real estate." },
];

export default function WhyChooseUs() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "#8a6a2e" }}>Why PropKnown</p>
            <h2
              className="section-heading mb-6"
              style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}
            >
              The Difference Is In <span className="gold-text">The Details</span>
            </h2>
            <p className="text-gray-600 leading-relaxed mb-8">
              Founded by <strong className="text-gray-900">Pinnelli Raghu Kiran</strong> — IIM PG Diploma,
              ISB AMPI, BITS, with 20+ years in Product Management — PropKnown brings a
              rare combination of technology, analytics, and on-ground expertise to every
              real estate transaction.
            </p>

            {/* Quote */}
            <blockquote className="border-l-4 pl-6 py-2" style={{ borderColor: "#8a6a2e" }}>
              <p className="text-gray-700 italic text-lg" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
                &ldquo;Real estate decisions should be data-driven, not impulse-driven.
                That&apos;s the PropKnown promise.&rdquo;
              </p>
              <footer className="mt-3 text-sm font-semibold" style={{ color: "#8a6a2e" }}>
                — Pinnelli Raghu Kiran, Founder
              </footer>
            </blockquote>
          </div>

          {/* Right — grid of points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {POINTS.map((p) => (
              <div key={p.title} className="bg-gray-50 border border-gray-200 rounded-xl p-5 hover:border-yellow-500 transition-colors group shadow-sm">
                <p.icon size={22} className="mb-3" style={{ color: "#8a6a2e" }} />
                <h3 className="text-gray-900 font-semibold text-sm mb-1.5 group-hover:text-yellow-700 transition-colors">
                  {p.title}
                </h3>
                <p className="text-gray-500 text-xs leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
