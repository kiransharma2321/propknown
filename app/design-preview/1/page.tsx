import PKLogo from "@/components/layout/PKLogo";
import { loadPreviewData } from "../_data";
import { CheckCard, ThreeWay, ReportCTA, Reveal, ConfidencePill } from "../_kit";
import { HONEST_TRUST, NAVY, GOLD } from "../_consts";

// Direction 1 — "Editorial Luxe": deep navy, large serif display type, gold hairlines, a
// magazine-like grid. The product (price check) sits in the hero as a floating glass card.
export const dynamic = "force-dynamic";

export default async function Direction1() {
  const data = await loadPreviewData();
  return (
    <main style={{ background: NAVY }} className="text-white overflow-x-hidden">
      <header className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <PKLogo dark />
        <nav className="hidden md:flex gap-7 text-sm text-white/70">
          <span>Prices</span><span>Project check</span><span>Fraud check</span><span>Guides</span>
        </nav>
        <span className="rounded-full border border-white/25 px-4 py-2 text-xs">Talk to an advisor</span>
      </header>

      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-20 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
        <div aria-hidden className="pointer-events-none absolute -top-20 right-0 h-[480px] w-[480px] rounded-full blur-3xl opacity-25" style={{ background: GOLD }} />
        <Reveal hero>
          <p className="text-[11px] tracking-[0.35em] uppercase" style={{ color: GOLD }}>Hyderabad · Bengaluru · Dubai</p>
          <h1 className="font-playfair text-[42px] leading-[1.05] sm:text-6xl mt-5">
            Know the fair price <span className="italic" style={{ color: GOLD }}>before</span> you pay the token.
          </h1>
          <p className="mt-6 text-white/70 max-w-lg text-lg">Check any area, project or quote against live market data, every figure with its sources, date and a confidence level.</p>
          <div className="mt-8 flex flex-wrap gap-3"><ReportCTA dark /><span className="rounded-full border border-white/25 px-5 py-3 text-sm">See area prices</span></div>
        </Reveal>
        <Reveal hero delay={0.15}><div className="backdrop-blur-xl"><CheckCard data={data} dark /></div></Reveal>
      </section>

      <section className="border-y border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <Reveal><h2 className="font-playfair text-3xl sm:text-4xl">Three numbers. One honest answer.</h2>
            <p className="text-white/60 mt-2 mb-8 max-w-xl">The government guidance value, our AI market estimate and the asking price, side by side.</p></Reveal>
          <ThreeWay data={data} dark />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <Reveal><div className="flex items-end justify-between mb-6"><h2 className="font-playfair text-3xl">Area prices this week</h2><span className="text-xs text-white/50">Apartments · AI estimates</span></div></Reveal>
        <div className="grid gap-px rounded-2xl overflow-hidden bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {data.areas.map((a, i) => (
            <Reveal key={a.slug} delay={i * 0.05}>
              <div className="h-full p-6" style={{ background: NAVY }}>
                <p className="text-sm text-white/60">{a.area}</p>
                {a.price?.price ? (
                  <>
                    <p className="font-playfair text-3xl mt-2">₹{a.price.price.toLocaleString("en-IN")}<span className="text-sm text-white/40">/sq.ft</span></p>
                    <div className="mt-3 flex items-center gap-2"><ConfidencePill level={a.price.confidence?.level} dark /><span className="text-[10px] text-white/40">{a.price.capturedAt ? new Date(a.price.capturedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}</span></div>
                  </>
                ) : <p className="text-white/40 mt-2 text-sm">Not enough data yet</p>}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 grid gap-8 lg:grid-cols-2">
        <Reveal>
          <div className="rounded-3xl p-8 h-full" style={{ background: `linear-gradient(135deg, ${GOLD}26, transparent)` }}>
            <p className="text-[11px] tracking-[0.3em] uppercase" style={{ color: GOLD }}>Free Fair-Price Report</p>
            <h3 className="font-playfair text-3xl mt-3">The whole picture, in one PDF.</h3>
            <p className="text-white/70 mt-3">Price and range, confidence, govt value, 5-year trend, true cost with stamp duty and GST, and every source with its date.</p>
            <div className="mt-6"><ReportCTA dark /></div>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <ul className="space-y-4 h-full flex flex-col justify-center">
            {HONEST_TRUST.map((t) => <li key={t} className="flex gap-3 text-white/80"><span className="mt-2 h-px w-6 shrink-0" style={{ background: GOLD }} />{t}</li>)}
          </ul>
        </Reveal>
      </section>
    </main>
  );
}
