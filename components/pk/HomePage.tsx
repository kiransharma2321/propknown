import Link from "next/link";
import { Scale, Building2, ShieldCheck, FileSearch, Calculator, TrendingUp, BarChart3, MessageSquareText, Landmark, Sparkles, Tag, FileDown, Mic2 } from "lucide-react";
import HomeHero from "@/components/pk/HomeHero";
import PriceBoard from "@/components/pk/PriceBoard";
import { Reveal } from "@/components/pk/Reveal";
import { CountUp, RevealObserver } from "@/components/pk/Motion";
import { PK, TRUST_FACTS, REGISTRATIONS } from "@/components/pk/tokens";
import { loadHome } from "@/components/pk/homeData";
import { getHeroExamples } from "@/lib/heroExamples";
import StatsSection from "@/components/sections/StatsSection";
import ProtectionSection from "@/components/sections/ProtectionSection";
import NRITeaser from "@/components/sections/NRITeaser";
import PropertySearchSection from "@/components/sections/PropertySearchSection";
import FeaturedProperties from "@/components/sections/FeaturedProperties";
import ServicesSection from "@/components/sections/ServicesSection";
import WhyChooseUs from "@/components/sections/WhyChooseUs";
import AITeaser from "@/components/sections/AITeaser";
import PriceCheckTeaser from "@/components/sections/PriceCheckTeaser";
import CTASection from "@/components/sections/CTASection";

// Homepage (Direction 1 restyle). Every section of the current homepage (app/(public)/page.tsx)
// stays, in the same order, restyled only. New sections are slotted in between, from real data
// only; a new section with nothing to show is hidden.
const day = (d: string | Date | null | undefined) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

const TOOLS = [
  { icon: Scale, title: "Price Check", desc: "Is a quoted price fair for its area?", href: "/price-check", soon: false },
  { icon: Building2, title: "Project Check", desc: "Live asking prices for a named project.", href: "/price-check#project", soon: false },
  { icon: ShieldCheck, title: "Legal Shield / RERA", desc: "RERA format, red flags, what to verify.", href: "/legal-shield", soon: false },
  { icon: FileSearch, title: "Document Checker", desc: "Sale deed, EC and approvals — preliminary review.", href: "", soon: true },
  { icon: Calculator, title: "True Cost", desc: "Stamp duty, registration, GST and EMI.", href: "/true-cost", soon: false },
  { icon: TrendingUp, title: "Investment Score", desc: "A published, explainable 0–100 score.", href: "", soon: true },
  { icon: BarChart3, title: "AI Intel", desc: "Area dashboards across property types.", href: "/ai-intelligence", soon: false },
  { icon: MessageSquareText, title: "KnownAI", desc: "Ask and compare areas in plain English.", href: "/price-check", soon: false },
];

export default async function HomePage() {
  const [d, examples] = await Promise.all([loadHome(), getHeroExamples()]);
  const p = d.threeWay.project;
  const dark = { background: PK.navy };
  return (
    <>
      {/* Existing: hero (restyled; Project / My quote tabs added inside the check card) */}
      <HomeHero examples={examples} />
      {/* Below the fold: .pk-cv lets the browser skip layout of off-screen sections (PageSpeed). */}
      <div className="pk-cv">
      {/* Existing */}
      <StatsSection />

      {/* NEW: three numbers */}
      <section className="text-white" style={dark}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <Reveal><h2 className="font-playfair text-3xl sm:text-5xl">Three numbers. One honest answer.</h2>
            <p className="text-white/60 mt-3 mb-10 max-w-2xl">Before you negotiate, see the government guidance value, our AI market estimate and the asking price side by side — each labelled for what it is.</p></Reveal>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: Landmark, label: "Govt guidance value", kind: "Official", value: "Not yet entered", note: "Copied by hand from IGRS with its effective date. Not available for this area yet.", muted: true },
              { icon: Sparkles, label: "AI market estimate", kind: "AI estimate", value: d.threeWay.aiArea?.price ? `₹${d.threeWay.aiArea.price.toLocaleString("en-IN")}/sq.ft` : "—", note: d.threeWay.aiArea ? `Financial District · captured ${day(d.threeWay.aiArea.capturedAt)}` : "", muted: false },
              { icon: Tag, label: "Asking price", kind: "Asking (listings)", value: p ? `₹${p.median.toLocaleString("en-IN")}/sq.ft` : "—", note: p ? `${p.name} · median across ${p.sources} ${p.sources === 1 ? "website" : "websites"} · ${day(p.capturedAt)}` : "", muted: false },
            ].map((c, i) => (
              <Reveal key={c.label} delay={i * 0.08}>
                <div className="h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-white/25">
                  <div className="flex items-center justify-between"><c.icon size={20} style={{ color: PK.gold }} /><span className="text-[10px] uppercase tracking-wider rounded-full border border-white/15 px-2 py-0.5 text-white/60">{c.kind}</span></div>
                  <p className="text-sm text-white/60 mt-5">{c.label}</p>
                  <p className={`font-playfair mt-1 ${c.muted ? "text-xl text-white/50" : "text-4xl"}`}>{c.value}</p>
                  <p className="text-xs text-white/45 mt-2">{c.note}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* NEW: Hyderabad Price Board */}
      <section className="text-white border-t border-white/10" style={dark}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] items-center">
          <Reveal className="min-w-0">
            <h2 className="font-playfair text-3xl sm:text-5xl">Hyderabad, area by area.</h2>
            <p className="text-white/60 mt-4">Typical apartment rates from live web sources. Tap any bar for its sources, range and captured date.</p>
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div><p className="font-playfair text-3xl" style={{ color: PK.gold }}><CountUp value={d.counts.hyderabadLocalities} /></p><p className="text-xs text-white/55">Hyderabad localities with price pages</p></div>
              <div><p className="font-playfair text-3xl" style={{ color: PK.gold }}><CountUp value={d.counts.areasWithData} /></p><p className="text-xs text-white/55">areas with live price data</p></div>
              <div><p className="font-playfair text-3xl" style={{ color: PK.gold }}><CountUp value={d.counts.cachedPrices} /></p><p className="text-xs text-white/55">published area prices</p></div>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="min-w-0"><PriceBoard rows={d.boardRows} /></Reveal>
        </div>
      </section>

      {/* Existing */}
      <ProtectionSection />
      <NRITeaser />
      <PropertySearchSection />
      <FeaturedProperties />

      {/* NEW: verified projects (approved through the 10-point checklist only; hidden if none) */}
      {d.verifiedProjects.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <Reveal><h2 className="heading-h2 mb-8">New verified projects</h2></Reveal>
          <div className="grid gap-4 md:grid-cols-3">
            {d.verifiedProjects.map((v) => (
              <Link key={v.id} href="/buy" className="card-dark p-6 transition hover:-translate-y-1">
                <p className="font-semibold">{v.title}</p>
                <p className="text-sm text-gray-500">{[v.location, v.city].filter(Boolean).join(", ")}{v.reraNumber ? ` · RERA ${v.reraNumber}` : ""}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Existing */}
      <ServicesSection />

      {/* NEW: tools grid */}
      <section className="text-white" style={{ background: PK.navyDeep }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <Reveal><h2 className="font-playfair text-3xl sm:text-5xl">Our tools</h2><p className="text-white/60 mt-3 mb-10">Free to use. Each one shows where its numbers come from.</p></Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((t, i) => {
              const inner = (
                <div className={`h-full rounded-3xl border border-white/10 p-6 transition ${t.soon ? "opacity-70" : "hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.06]"}`}>
                  <div className="flex items-center justify-between"><t.icon size={22} style={{ color: PK.gold }} />{t.soon && <span className="text-[10px] uppercase tracking-wider text-white/50">Coming soon</span>}</div>
                  <p className="font-semibold mt-5">{t.title}</p>
                  <p className="text-sm text-white/55 mt-1">{t.desc}</p>
                </div>
              );
              return <Reveal key={t.title} delay={(i % 4) * 0.05}>{t.soon ? inner : <Link href={t.href} className="block h-full">{inner}</Link>}</Reveal>;
            })}
          </div>
        </div>
      </section>

      {/* Existing */}
      <WhyChooseUs />
      <AITeaser />

      {/* NEW: how it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <Reveal><h2 className="heading-h2 mb-10">How it works</h2></Reveal>
        <ol className="grid gap-6 md:grid-cols-3">
          {[
            ["Tell us what you're looking at", "An area, a project name, or the price you were quoted."],
            ["We read the live market", "Current listing and price pages for that exact area or project — never a city-wide average."],
            ["You get the fair range, with proof", "Range, confidence level, sources and dates — plus the true cost and what to verify next."],
          ].map(([t, s], i) => (
            <Reveal key={t} delay={i * 0.08}>
              <li className="card-dark p-6 h-full">
                <span className="font-playfair text-5xl" style={{ color: `${PK.gold}99` }}>0{i + 1}</span>
                <p className="font-semibold mt-3 text-gray-900">{t}</p>
                <p className="text-sm text-gray-500 mt-1">{s}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Existing */}
      <PriceCheckTeaser />

      {/* NEW: Fair-Price Report CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] p-8 sm:p-12 grid gap-8 lg:grid-cols-[1.3fr_0.7fr] items-center text-white" style={{ background: `linear-gradient(135deg, ${PK.navy}, ${PK.navySoft} 60%, ${PK.gold}55)` }}>
            <div>
              <p className="text-[11px] tracking-[0.3em] uppercase" style={{ color: PK.gold }}>Free Fair-Price Report</p>
              <h2 className="font-playfair text-3xl sm:text-5xl mt-3">The whole picture, in one PDF.</h2>
              <p className="text-white/70 mt-4 max-w-xl">Price and range, confidence, govt value, 5-year trend, true cost with stamp duty and GST, and every source with its date. Emailed to you, free.</p>
            </div>
            <Link href="/price-check#report" className="justify-self-start lg:justify-self-end inline-flex items-center gap-2 rounded-full px-7 py-4 font-semibold transition hover:-translate-y-0.5" style={{ background: PK.gold, color: PK.navy }}><FileDown size={18} /> Get my report</Link>
          </div>
        </Reveal>
      </section>

      {/* NEW: market news + guides (published / reviewed only; hidden if none) */}
      {(d.news.length > 0 || d.guides.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <Reveal><h2 className="heading-h2 mb-8">Market news & guides</h2></Reveal>
          <div className="grid gap-4 md:grid-cols-3">
            {d.news.map((n) => <Link key={n.id} href={`/news/${n.slug}`} className="card-dark p-6 hover:-translate-y-1 transition"><p className="text-xs text-gray-500">News · {day(n.publishedAt)}</p><p className="font-semibold mt-2">{n.title}</p></Link>)}
            {d.guides.map((g) => <Link key={g.slug} href={`/guides/${g.slug}`} className="card-dark p-6 hover:-translate-y-1 transition"><p className="text-xs text-gray-500">Guide</p><p className="font-semibold mt-2">{g.title}</p></Link>)}
          </div>
        </section>
      )}

      {/* NEW: podcast (after the first published episode) */}
      {d.episode && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
          <Link href={`/podcast/${d.episode.slug}`} className="card-dark flex items-center gap-4 p-6"><Mic2 style={{ color: PK.gold }} /><div><p className="text-xs text-gray-500">The PropKnown Podcast</p><p className="font-semibold">{d.episode.title}</p></div></Link>
        </section>
      )}

      {/* NEW: honest trust strip */}
      <section className="text-white" style={dark}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid gap-6 md:grid-cols-4">
          {[...REGISTRATIONS.filter((r) => r.number).map((r) => `${r.label} · ${r.number}`), ...TRUST_FACTS].map((t, i) => (
            <Reveal key={t} delay={i * 0.05}><p className="text-sm text-white/75 border-l-2 pl-3" style={{ borderColor: PK.gold }}>{t}</p></Reveal>
          ))}
        </div>
      </section>

      {/* Existing */}
      <CTASection />
      </div>
      <RevealObserver />
    </>
  );
}
