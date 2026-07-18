"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const HERO_POSTER = "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1920&q=80";

export default function HeroSection() {
  const router = useRouter();

  const [area, setArea] = useState("");
  const [city, setCity] = useState("");

  // Lightweight handoff only -- no fetch happens on the homepage. The actual AI Intelligence
  // engine, its 3-free-check gate, and its pricing/grounding logic all live untouched on
  // /ai-intelligence; this just pre-fills the same two fields a "Popular Markets" chip click
  // already fills there today.
  const handleCheckPrice = () => {
    const params = new URLSearchParams();
    if (area) params.set("area", area);
    if (city) params.set("city", city);
    router.push(`/ai-intelligence?${params.toString()}`);
  };

  const inp = "input-dark px-3 py-2.5 text-sm";

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start md:justify-center overflow-hidden">
      {/* Background — Next/Image gives us automatic AVIF/WebP + responsive srcset + a
          fetchpriority=high preload hint via `priority`, which is what actually gets this
          under the LCP budget (the old raw Unsplash URL shipped a flat 409KB JPEG to every
          device regardless of screen size). `priority` also means this is intentionally NOT
          lazy-loaded, since it's the above-the-fold LCP candidate. */}
      <Image
        src={HERO_POSTER}
        alt=""
        fill
        priority
        sizes="100vw"
        quality={70}
        className="object-cover"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/50 to-transparent" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 text-center pt-24 pb-16 md:pt-36 md:pb-28">

        {/* Badge — hidden on mobile to keep headline/CTA above the fold; shown from sm up */}
        <div
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#D6A63E]/40 text-[#D6A63E] text-xs font-medium mb-6 backdrop-blur-sm"
          style={{ background: "rgba(214,166,62,0.12)" }}
        >
          <span className="w-2 h-2 rounded-full bg-[#D6A63E] animate-pulse" />
          AI-Powered Intelligence · RERA-Verified Listings · Zero Broker Spam
        </div>

        {/* Headline */}
        <h1
          className="font-playfair text-3xl sm:text-5xl md:text-6xl lg:text-[58px] font-bold text-white mb-4 md:mb-6 leading-tight max-w-4xl mx-auto"
          style={{ textShadow: "0 2px 40px rgba(0,0,0,0.5), 0 0 80px rgba(0,0,0,0.3)" }}
        >
          Know What It&apos;s Really Worth
          <br />
          <span style={{
            background: "linear-gradient(135deg,#D6A63E,#e8c97a,#D6A63E)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
          }}>— Before You Buy</span>
        </h1>
        <p className="text-white/80 text-sm sm:hidden max-w-2xl mx-auto mb-6">
          AI-verified prices. RERA-checked listings. The honest truth about any property.
        </p>
        <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 hidden sm:block leading-relaxed">
          AI-verified prices. RERA-checked listings. The honest truth about any property —
          even when it&apos;s not what the seller wants you to hear.
        </p>

        {/* Check-price card: lightweight input (left) + static example (right) */}
        <div className="mx-auto max-w-4xl">
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-2xl grid sm:grid-cols-2 gap-5 text-left">

            {/* Lightweight input -- no autocomplete, no fetch, just a handoff to the real tool */}
            <div className="flex flex-col">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                Check Any Location&apos;s Real Price
              </p>
              <div className="space-y-2 mb-3">
                <input
                  type="text" value={area} onChange={e => setArea(e.target.value)}
                  placeholder="Area, e.g. Kokapet"
                  className={inp}
                />
                <input
                  type="text" value={city} onChange={e => setCity(e.target.value)}
                  placeholder="City, e.g. Hyderabad"
                  className={inp}
                />
              </div>
              <button
                onClick={handleCheckPrice}
                className="btn-primary justify-center text-sm py-2.5 px-6 w-full mt-auto"
              >
                Check Real Price <ArrowRight size={15} />
              </button>
            </div>

            {/* Static example result -- hardcoded, zero API cost, proves the tool works */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--gold-text)" }}>
                Example Result
              </p>
              <p className="text-gray-900 font-bold text-sm">Kokapet, Hyderabad · Apartment</p>
              <p className="font-playfair text-2xl font-bold mt-1" style={{ color: "var(--gold-text)" }}>
                ₹11,250<span className="text-sm font-normal text-gray-400">/sqft</span>
              </p>
              <p className="text-gray-500 text-xs mt-1">Realistic range: ₹10,340 – ₹17,000/sqft</p>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-2">
                <CheckCircle2 size={12} className="text-green-600 shrink-0" />
                Sources: 99acres, MagicBricks, Housing.com
              </div>
              <p className="text-gray-400 text-[11px] leading-relaxed mt-2 italic">
                &quot;AI estimate based on live web search — verify the specific property before deciding.&quot;
              </p>
              <p className="text-gray-300 text-[10px] mt-auto pt-2">Example only · not live data · captured July 2026</p>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {[
            { val: "Zero", label: "Fake Listings" },
            { val: "AI 9.2", label: "Highest Rated" },
            { val: "Global", label: "Reach" },
            { val: "₹0", label: "Brokerage" },
          ].map(({ val, label }) => (
            <div key={label} className="text-center">
              <p className="font-playfair text-2xl font-bold gold-accent">{val}</p>
              <p className="text-white/70 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
