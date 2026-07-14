"use client";

import { useState } from "react";
import { Search, ChevronDown, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const CITIES = [
  "Hyderabad", "Bangalore", "Mumbai", "Pune", "Chennai",
  "Delhi NCR", "Dubai", "Singapore", "London", "Toronto",
];

const PROP_TYPES = [
  "Apartment", "Villa", "Independent House", "Commercial", "Plot",
  "Agriculture Land", "Farm Land",
];

const BUDGETS = [
  "Under ₹30L", "₹30L – ₹50L", "₹50L – ₹1 Crore",
  "₹1Cr – ₹2Cr", "₹2Cr – ₹5Cr", "₹5 Crore+",
];

const HERO_POSTER = "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1920&q=80";

export default function HeroSection() {
  const router = useRouter();

  const [city,     setCity]     = useState("");
  const [area,     setArea]     = useState("");
  const [areaSize, setAreaSize] = useState("");
  const [propType, setPropType] = useState("");
  const [budget,   setBudget]   = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (city)     params.set("city",    city);
    if (area)     params.set("area",    area);
    if (areaSize) params.set("size",    areaSize);
    if (propType) params.set("type",    propType);
    if (budget)   params.set("budget",  budget);
    router.push(`/buy?${params.toString()}`);
  };

  const sel = "input-dark appearance-none px-3 py-2.5 pr-8 text-sm";
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
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 text-center pt-24 pb-16 md:pt-44 md:pb-32">

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
          className="font-playfair text-3xl sm:text-5xl md:text-6xl lg:text-[64px] font-bold text-white mb-3 md:mb-6 leading-tight"
          style={{ textShadow: "0 2px 40px rgba(0,0,0,0.5), 0 0 80px rgba(0,0,0,0.3)" }}
        >
          India&apos;s Most Trusted
          <br />
          <span style={{
            background: "linear-gradient(135deg,#D6A63E,#e8c97a,#D6A63E)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
          }}>AI Real Estate Platform</span>
        </h1>
        {/* Short one-line version on mobile so it never wraps within the fold; full copy from sm up */}
        <p className="text-white/80 text-sm sm:hidden max-w-2xl mx-auto mb-5">
          AI-Powered. RERA-Verified. Zero Spam.
        </p>
        <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 hidden sm:block">
          AI-Powered Intelligence. RERA-Verified Listings. Honest Pricing — Always.
        </p>

        {/* Single high-contrast CTA — above the fold on mobile, ahead of the search card */}
        <Link
          href="/price-check"
          className="btn-primary inline-flex text-base px-8 py-4 mb-8 md:hidden"
        >
          Check Property Price Free <ArrowRight size={16} />
        </Link>

        {/* Search card */}
        <div className="mx-auto max-w-5xl">
          <div className="bg-white rounded-2xl p-5 shadow-2xl">

            {/* Row 1: City, Area, Area Size */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">

              {/* Step 1 – City */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  <span className="text-[#7A5C1A]">①</span> City
                </label>
                <div className="relative">
                  <select value={city} onChange={e => setCity(e.target.value)} className={sel}>
                    <option value="">Select City</option>
                    {CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Step 2 – Area / Locality */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  <span className="text-[#7A5C1A]">②</span> Area / Locality
                </label>
                <input
                  type="text" value={area} onChange={e => setArea(e.target.value)}
                  placeholder="e.g. Kokapet, Gachibowli…"
                  className={inp}
                />
              </div>

              {/* Step 3 – Area Size */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  <span className="text-[#7A5C1A]">③</span> Area Size (sq.ft)
                </label>
                <input
                  type="number" value={areaSize} onChange={e => setAreaSize(e.target.value)}
                  placeholder="e.g. 1200"
                  className={inp}
                />
              </div>
            </div>

            {/* Row 2: Property Type, Budget, Search */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">

              {/* Step 4 – Property Type */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  <span className="text-[#7A5C1A]">④</span> Property Type
                </label>
                <div className="relative">
                  <select value={propType} onChange={e => setPropType(e.target.value)} className={sel}>
                    <option value="">All Types</option>
                    {PROP_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Step 5 – Budget (optional) */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  <span className="text-[#7A5C1A]">⑤</span> Budget <span className="normal-case text-gray-300 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <select value={budget} onChange={e => setBudget(e.target.value)} className={sel}>
                    <option value="">Any Budget</option>
                    {BUDGETS.map(b => <option key={b}>{b}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Step 6 – Search */}
              <button
                onClick={handleSearch}
                className="btn-primary justify-center text-sm py-2.5 px-6 w-full"
              >
                <Search size={16} />
                Search Properties
              </button>
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
