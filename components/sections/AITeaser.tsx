import Link from "next/link";
import { Bot, TrendingUp, BarChart3, AlertCircle, ArrowRight } from "lucide-react";

export default function AITeaser() {
  return (
    <section className="py-20 bg-zinc-950 relative overflow-hidden">
      {/* BG decoration */}
      <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-gold-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-gold-500/5 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gold-500 flex items-center justify-center">
                <Bot size={20} className="text-black" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">KnownAI Market Intelligence</p>
                <p className="text-zinc-500 text-xs">Powered by PropKnown</p>
              </div>
            </div>

            <h2 className="section-heading-dark mb-6" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
              Know Any Area&apos;s <span className="gold-text">True Value</span>
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-8">
              AI-powered market valuations, 5-year forecasts, rental yield estimates, and honest
              investment ratings — grounded in real listings, for any city or neighbourhood worldwide.
            </p>

            <div className="space-y-3 mb-8">
              {[
                { icon: TrendingUp, text: "5-year price forecast with growth percentage" },
                { icon: BarChart3,  text: "Market trend analysis: Bullish / Stable / Cautious" },
                { icon: Bot,        text: "AI investment rating, rental yield & best-use score" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-zinc-300 text-sm">
                  <Icon size={16} className="text-gold-400 shrink-0" />
                  {text}
                </div>
              ))}
            </div>

            <Link href="/ai-intelligence" className="btn-primary">
              Get Market Intelligence <ArrowRight size={16} />
            </Link>
          </div>

          {/* Right — mock UI */}
          <div className="bg-black border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="border-b border-zinc-800 px-5 py-3 flex items-center gap-2">
              {["bg-red-500", "bg-yellow-500", "bg-green-500"].map((c) => (
                <span key={c} className={`w-3 h-3 rounded-full ${c}`} />
              ))}
              <span className="text-zinc-500 text-xs ml-2 font-mono">PropKnown AI Valuation</span>
            </div>

            <div className="p-6 space-y-5">
              {/* Sample output */}
              <div className="bg-zinc-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-zinc-400 text-sm">Gachibowli, Hyderabad</span>
                  <span className="bg-green-950 text-green-400 text-xs px-2 py-1 rounded border border-green-800 font-bold">
                    BUY ↑
                  </span>
                </div>
                <p className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
                  ₹1.24 Cr
                </p>
                <p className="text-zinc-500 text-xs">Estimated current value · 1,200 sqft</p>
              </div>

              {/* 5yr forecast bars */}
              <div>
                <p className="text-zinc-400 text-xs mb-3 uppercase tracking-wider">5-Year Forecast</p>
                <div className="flex items-end gap-2 h-20">
                  {[55, 65, 74, 85, 100].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t-sm bg-gold-500/30 border-t border-gold-500"
                        style={{ height: `${h}%` }}
                      />
                      <span className="text-[9px] text-zinc-600">{2026 + i}</span>
                    </div>
                  ))}
                </div>
                <p className="text-green-400 text-xs mt-2">+11.2% avg annual growth projected</p>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-2 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
                <AlertCircle size={13} className="text-zinc-500 shrink-0 mt-0.5" />
                <p className="text-zinc-600 text-[10px] leading-relaxed">
                  AI-generated estimates. Indicative only, not guaranteed. Verify with RERA and local experts
                  before any decision.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
