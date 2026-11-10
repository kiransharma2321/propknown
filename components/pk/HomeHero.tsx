"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Building2, MapPin, Receipt } from "lucide-react";
import HeroExampleCarousel from "@/components/sections/HeroExampleCarousel";
import type { HeroExample } from "@/lib/heroExamples";
import { HERO_PHOTO, PK } from "./tokens";

// The existing homepage hero (components/sections/HeroSection.tsx), restyled: same badge,
// copy (headline updated as approved), Area + City check (same /ai-intelligence handoff), example carousel and
// stats strip. Added inside the same card: "Project" and "My quote" tabs, which hand off to
// the Project check on /price-check.

type Tab = "area" | "project" | "quote";

export default function HomeHero({ examples }: { examples: HeroExample[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("area");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [project, setProject] = useState("");
  const [quote, setQuote] = useState("");

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "area") {
      const params = new URLSearchParams();
      if (area) params.set("area", area);
      if (city) params.set("city", city);
      router.push(`/ai-intelligence?${params.toString()}`);
      return;
    }
    const params = new URLSearchParams();
    if (area) params.set("location", city ? `${area}, ${city}` : area);
    if (project) params.set("project", project);
    if (tab === "quote" && quote) params.set("quote", quote);
    router.push(`/price-check?${params.toString()}#project`);
  };

  const inp = "input-dark px-3 py-2.5 text-sm";

  return (
    <section className="relative isolate min-h-screen flex flex-col items-center justify-start md:justify-center overflow-hidden">
      <Image src={`${HERO_PHOTO.src}?w=1920&q=70&auto=format&fit=crop`} alt="" fill priority sizes="100vw" quality={70} className="-z-20 object-cover" />
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: `linear-gradient(180deg, ${PK.navyDeep}D9 0%, ${PK.navy}B3 45%, ${PK.navyDeep}E6 100%)` }} />
      <div aria-hidden className="pk-glow absolute -z-10 right-[-10%] top-[15%] h-[480px] w-[480px] rounded-full blur-3xl" style={{ background: `${PK.gold}33` }} />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 text-center pt-28 pb-16 md:pt-40 md:pb-24">
        <div className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#D6A63E]/40 text-[#D6A63E] text-xs font-medium mb-6 backdrop-blur-sm" style={{ background: "rgba(214,166,62,0.12)" }}>
          <span className="w-2 h-2 rounded-full bg-[#D6A63E] animate-pulse" />
          AI-Powered Intelligence · Zero Broker Spam
        </div>

        <h1 className="font-playfair text-3xl sm:text-5xl md:text-6xl lg:text-[64px] font-bold text-white mb-4 md:mb-6 leading-[1.08] max-w-4xl mx-auto">
          Know the fair price
          <br />
          <span style={{ background: "linear-gradient(135deg,#D6A63E,#e8c97a,#D6A63E)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>before you pay the token.</span>
        </h1>
        <p className="text-white/80 text-sm sm:hidden max-w-2xl mx-auto mb-6">The honest truth about any property.</p>
        <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 hidden sm:block leading-relaxed">
          The honest truth about any property —
          even when it&apos;s not what the seller wants you to hear.
        </p>

        <div className="mx-auto max-w-4xl">
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-2xl grid sm:grid-cols-2 gap-5 text-left ring-1 ring-[#D6A63E]/30">
            <form onSubmit={handleCheck} className="flex flex-col">
              <div className="relative grid grid-cols-3 rounded-full bg-gray-100 p-1 mb-3" role="tablist" aria-label="What do you want to check?">
                {([["area", "Area", MapPin], ["project", "Project", Building2], ["quote", "My quote", Receipt]] as const).map(([k, label, Icon]) => (
                  <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                    className={`relative z-10 inline-flex items-center justify-center gap-1 rounded-full py-1.5 text-xs font-semibold transition-colors ${tab === k ? "text-white" : "text-gray-600"}`}>
                    {tab === k && <motion.span layoutId="home-hero-tab" className="absolute inset-0 -z-10 rounded-full" style={{ background: PK.navy }} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                    <Icon size={12} /> {label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                {tab === "area" ? <>Check Any Location&apos;s Real Price</> : tab === "project" ? "Check a project's asking price" : "Is my quoted price fair?"}
              </p>
              <div className="space-y-2 mb-3">
                {tab !== "area" && <input type="text" value={project} onChange={(e) => setProject(e.target.value)} placeholder="Project / apartment name" aria-label="Project or apartment name" className={inp} />}
                <input type="text" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area, e.g. Kokapet" aria-label="Area" className={inp} />
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City, e.g. Hyderabad" aria-label="City" className={inp} />
                {tab === "quote" && <input type="text" inputMode="numeric" value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Quoted total price (₹)" aria-label="Quoted total price" className={inp} />}
              </div>
              <button type="submit" className="btn-primary justify-center text-sm py-2.5 px-6 w-full mt-auto">
                Check Real Price <ArrowRight size={15} />
              </button>
            </form>

            <HeroExampleCarousel examples={examples} />
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {[{ val: "₹0", label: "Brokerage" }].map(({ val, label }) => (
            <div key={label} className="text-center">
              <p className="font-playfair text-2xl font-bold gold-accent">{val}</p>
              <p className="text-white/70 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="absolute bottom-3 right-4 text-[10px] text-white/40">{HERO_PHOTO.credit}</p>
    </section>
  );
}
