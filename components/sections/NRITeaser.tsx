import Link from "next/link";
import { Globe, Video, Headset, Coins, ArrowRight } from "lucide-react";

// Short teaser band, same visual family as AITeaser.tsx/PriceCheckTeaser.tsx -- surfaces the
// NRI offering (currently only reachable via nav) higher up the homepage for a high-value
// audience, without duplicating the full /nri page content.
const POINTS = [
  { icon: Video,   label: "Live virtual site tours" },
  { icon: Headset, label: "Dedicated NRI concierge" },
  { icon: Coins,   label: "Prices shown in your currency" },
];

export default function NRITeaser() {
  return (
    <section className="py-14 bg-zinc-950 border-y border-zinc-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--gold)" }}>
              <Globe size={14} /> For NRIs
            </div>
            <h2 className="heading-h2-dark mb-2">
              Investing From Abroad? <span className="gold-accent">We&apos;ve Got You.</span>
            </h2>
            <p className="text-zinc-400 max-w-xl">
              Buy property in India without setting foot in it — remote-friendly, RERA-verified, and built for the UAE, US, UK &amp; Singapore diaspora.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5 shrink-0">
            <div className="flex flex-col gap-2">
              {POINTS.map((p) => (
                <div key={p.label} className="flex items-center gap-2 text-zinc-300 text-sm">
                  <p.icon size={15} style={{ color: "var(--gold)" }} className="shrink-0" />
                  {p.label}
                </div>
              ))}
            </div>
            <Link href="/nri" className="btn-primary shrink-0">
              Explore NRI Services <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
