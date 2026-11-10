import PKLogo from "@/components/layout/PKLogo";
import { loadPreviewData } from "../_data";
import { CheckCard, ThreeWay, ReportCTA, Reveal, ConfidencePill } from "../_kit";
import { HONEST_TRUST, NAVY, GOLD } from "../_consts";

// Direction 3 — "Explorer": split screen. The question flow on the left, a live "price board"
// of areas on the right (tiles sized by price, no map library). On mobile the board becomes a
// swipeable strip under a sticky check bar.
export const dynamic = "force-dynamic";

export default async function Direction3() {
  const data = await loadPreviewData();
  const priced = data.areas.filter((a) => a.price?.price);
  const max = Math.max(...priced.map((a) => a.price!.price!), 1);
  return (
    <main className="bg-white text-[#0B1B33] overflow-x-hidden">
      <header className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <PKLogo />
        <ReportCTA />
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 grid gap-6 lg:grid-cols-2 lg:min-h-[78vh] items-stretch">
        <Reveal hero className="flex flex-col justify-center py-8">
          <h1 className="font-playfair text-4xl sm:text-5xl leading-tight">Every area. Every project.<br /><span style={{ color: "#7A5C1A" }}>One fair price.</span></h1>
          <p className="text-gray-600 mt-4 max-w-md">Start with an area, a project name or the quote you were given. We show the evidence, not just a number.</p>
          <div className="mt-6 max-w-lg"><CheckCard data={data} /></div>
        </Reveal>

        <Reveal hero delay={0.1} className="rounded-3xl p-4 sm:p-6 flex flex-col" >
          <div className="rounded-3xl p-5 sm:p-6 h-full" style={{ background: NAVY }}>
            <div className="flex items-center justify-between text-white/70 text-xs mb-4">
              <span className="tracking-[0.25em] uppercase" style={{ color: GOLD }}>Hyderabad price board</span>
              <span>Apartments · ₹/sq.ft</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {data.areas.map((a, i) => {
                const share = a.price?.price ? a.price.price / max : 0;
                return (
                  <Reveal key={a.slug} delay={0.05 * i}>
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 p-4 text-white min-h-[120px]">
                      <div aria-hidden className="absolute inset-x-0 bottom-0 transition-all duration-700" style={{ height: `${Math.round(share * 100)}%`, background: `linear-gradient(to top, ${GOLD}55, transparent)` }} />
                      <div className="relative">
                        <p className="text-xs text-white/70">{a.area}</p>
                        {a.price?.price ? (
                          <>
                            <p className="font-playfair text-2xl mt-1">₹{a.price.price.toLocaleString("en-IN")}</p>
                            <div className="mt-2"><ConfidencePill level={a.price.confidence?.level} dark /></div>
                          </>
                        ) : <p className="text-xs text-white/50 mt-2">Not enough data yet</p>}
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
            <p className="text-[10px] text-white/40 mt-4">AI estimates from live web sources, each with its captured date on the area page. Bar height = price relative to the highest shown.</p>
          </div>
        </Reveal>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <Reveal><h2 className="font-playfair text-3xl mb-2">Before you negotiate</h2><p className="text-gray-600 mb-8">The three numbers that matter, together.</p></Reveal>
        <ThreeWay data={data} />
      </section>

      <section className="border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid gap-6 md:grid-cols-4">
          {HONEST_TRUST.map((t, i) => (
            <Reveal key={t} delay={i * 0.06}><p className="text-sm text-gray-700 border-l-2 pl-3" style={{ borderColor: GOLD }}>{t}</p></Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}
