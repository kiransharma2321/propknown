import Link from "next/link";
import { Scale, CheckCircle2, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

export default function PriceCheckTeaser() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "var(--gold-text)" }}>Free Tool</p>
            <h2 className="heading-h2 mb-4">
              Seen a Property Price? <span className="gold-text">Check If It&apos;s Fair.</span>
            </h2>
            <p className="text-gray-500 leading-relaxed mb-8">
              Paste in any property&apos;s price and details — from any listing site, broker, or builder,
              not just PropKnown — and get an instant, honest verdict against current live market rates.
              No login needed to try it.
            </p>
            <Link href="/price-check" className="btn-primary">
              Check a Price <ArrowRight size={16} />
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
            <div className="flex items-center gap-2 mb-5">
              <Scale size={16} style={{ color: "var(--gold-text)" }} />
              <span className="text-gray-900 font-semibold text-sm">Price Reality Check</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm"
                style={{ background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.35)", color: "#16a34a" }}>
                <CheckCircle2 size={16} /> Fair Price
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm"
                style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.35)", color: "#dc2626" }}>
                <TrendingUp size={16} /> Overpriced
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm"
                style={{ background: "rgba(6,182,212,0.08)", borderColor: "rgba(6,182,212,0.35)", color: "#0891b2" }}>
                <TrendingDown size={16} /> Underpriced
              </div>
              <p className="text-gray-400 text-xs mt-3 leading-relaxed">
                Backed by the same live web search behind PropKnown AI Intelligence — AI-analyzed, not a blind guess.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
