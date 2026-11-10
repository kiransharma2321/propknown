import PKLogo from "@/components/layout/PKLogo";
import { loadPreviewData } from "../_data";
import { CheckCard, ThreeWay, ReportCTA, Reveal, ConfidencePill } from "../_kit";
import { HONEST_TRUST, NAVY, GOLD, GOLD_TEXT } from "../_consts";

// Direction 2 — "Clarity": warm ivory, fintech-grade restraint. Product UI shown as bento cards,
// transparent "how we got this" explanation beside the calculator, big numerals for real data.
export const dynamic = "force-dynamic";

export default async function Direction2() {
  const data = await loadPreviewData();
  const fd = data.areas.find((a) => a.slug === "financial-district")?.price;
  return (
    <main className="bg-[#FBF8F2] text-[#0B1B33] overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-[#FBF8F2]/85 backdrop-blur border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <PKLogo />
          <span className="rounded-full px-4 py-2 text-xs font-semibold text-white" style={{ background: NAVY }}>Check a price</span>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-16 text-center">
        <Reveal hero>
          <span className="inline-block rounded-full border border-black/10 bg-white px-3 py-1 text-xs">Sources and dates on every number</span>
          <h1 className="font-playfair text-4xl sm:text-6xl leading-tight mt-5 max-w-3xl mx-auto">Is that price fair? <span style={{ color: GOLD_TEXT }}>Find out in seconds.</span></h1>
          <p className="mt-5 text-gray-600 max-w-xl mx-auto">Area, project or the quote in your hand — compared with live market data, with a confidence level you can trust.</p>
        </Reveal>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 grid gap-4 lg:grid-cols-6">
        <Reveal hero className="lg:col-span-4"><CheckCard data={data} /></Reveal>
        <Reveal className="lg:col-span-2" delay={0.1}>
          <div className="h-full rounded-2xl bg-white border border-gray-200 p-5">
            <p className="text-xs uppercase tracking-wider text-gray-500">How we got this number</p>
            <ol className="mt-3 space-y-3 text-sm text-gray-700">
              <li><b>1.</b> Read current listing and price pages for this exact area.</li>
              <li><b>2.</b> Extract the typical rate; ignore city-wide averages.</li>
              <li><b>3.</b> Cross-check sources and age → confidence level.</li>
            </ol>
          </div>
        </Reveal>
        {fd?.price && (
          <Reveal className="lg:col-span-2" delay={0.05}>
            <div className="h-full rounded-2xl p-5 text-white" style={{ background: NAVY }}>
              <p className="text-xs text-white/60">Financial District · apartment</p>
              <p className="font-playfair text-4xl mt-2">₹{fd.price.toLocaleString("en-IN")}</p>
              <p className="text-xs text-white/60">per sq.ft · captured {fd.capturedAt ? new Date(fd.capturedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}</p>
              <div className="mt-3"><ConfidencePill level={fd.confidence?.level} dark /></div>
            </div>
          </Reveal>
        )}
        <Reveal className="lg:col-span-4" delay={0.1}>
          <div className="h-full rounded-2xl bg-white border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <p className="font-playfair text-2xl">Free Fair-Price Report</p>
              <p className="text-sm text-gray-600 mt-1">Range, confidence, govt value, 5-year trend, true cost and dated sources — one PDF.</p>
            </div>
            <ReportCTA />
          </div>
        </Reveal>
      </section>

      <section className="bg-white border-y border-black/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <Reveal><h2 className="font-playfair text-3xl text-center">Govt value · AI estimate · Asking price</h2><p className="text-center text-gray-600 mt-2 mb-8">See all three before you negotiate.</p></Reveal>
          <ThreeWay data={data} />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <Reveal><h2 className="font-playfair text-3xl mb-6">Hyderabad, area by area</h2></Reveal>
        <div className="flex gap-3 overflow-x-auto snap-x pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible">
          {data.areas.map((a) => (
            <div key={a.slug} className="snap-start shrink-0 w-[70%] sm:w-auto rounded-2xl bg-white border border-gray-200 p-5 transition hover:-translate-y-1 hover:shadow-lg">
              <p className="text-sm text-gray-500">{a.area}</p>
              {a.price?.price ? <p className="font-playfair text-2xl mt-1">₹{a.price.price.toLocaleString("en-IN")}<span className="text-xs text-gray-400">/sq.ft</span></p> : <p className="text-sm text-gray-400 mt-1">Not enough data yet</p>}
              {a.price?.confidence && <div className="mt-2"><ConfidencePill level={a.price.confidence.level} /></div>}
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-3xl p-8 sm:p-10 grid gap-6 sm:grid-cols-2" style={{ background: `${GOLD}1F` }}>
          {HONEST_TRUST.map((t) => <p key={t} className="text-sm text-gray-800 flex gap-2"><span style={{ color: GOLD_TEXT }}>●</span>{t}</p>)}
        </div>
      </section>
    </main>
  );
}
