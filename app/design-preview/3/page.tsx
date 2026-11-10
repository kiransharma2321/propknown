import PKLogo from "@/components/layout/PKLogo";
import { loadPreviewData } from "../_data";
import { CheckCard, ThreeWay, ReportCTA, Reveal } from "../_kit";
import PriceBoard from "@/components/pk/PriceBoard";
import { HONEST_TRUST, GOLD } from "../_consts";

// Direction 3 — "Explorer": split screen. The question flow on the left, a live "price board"
// of areas on the right (tiles sized by price, no map library). On mobile the board becomes a
// swipeable strip under a sticky check bar.
export const dynamic = "force-dynamic";

export default async function Direction3() {
  const data = await loadPreviewData();
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

        <Reveal hero delay={0.1} className="py-4 lg:py-8 flex flex-col justify-center">
          {/* Fixed: bars render on the server at full size and grow on scroll (was blank until JS ran). */}
          <PriceBoard rows={data.areas.map((a) => ({
            area: a.area, href: `/ai-intelligence/hyderabad/${a.slug}`, price: a.price?.price ?? null,
            capturedAt: a.price?.capturedAt ?? null, confidence: a.price?.confidence?.level ?? null,
          }))} />
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
