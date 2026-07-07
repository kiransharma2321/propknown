"use client";

import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

// Self-hosted from public/videos/hero.mp4 -- see that folder's own note for the expected
// filename/format. If the file isn't there yet (dev environment, or before it's been added),
// the <video> tag's onError handler below falls back to the static poster image automatically
// -- nothing breaks either way.
const HERO_VIDEO = "/videos/hero.mp4";

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
  const [videoFailed, setVideoFailed] = useState(false);

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

  const sel = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-yellow-500 appearance-none bg-white pr-8";
  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-yellow-500 placeholder-gray-400";

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Video background — desktop and mobile. `poster` shows instantly on slow connections
          while the video buffers; if the video fails to load at all (missing file, unsupported
          format, etc.) onError swaps to the plain static fallback image below so the hero can
          never break. */}
      {!videoFailed && (
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay loop muted playsInline
          poster={HERO_POSTER}
          onError={() => setVideoFailed(true)}
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
      )}

      {/* Fallback background image — only shown if the video itself fails to load */}
      {videoFailed && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${HERO_POSTER}')` }}
        />
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/50 to-transparent" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 text-center py-32 pt-44">

        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-500/40 text-yellow-400 text-xs font-medium mb-6 backdrop-blur-sm"
          style={{ background: "rgba(201,162,75,0.12)" }}
        >
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          AI-Powered Intelligence · RERA-Verified Listings · Zero Broker Spam
        </div>

        {/* Headline */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
          style={{ fontFamily: "var(--font-playfair, Georgia, serif)", textShadow: "0 2px 40px rgba(0,0,0,0.5), 0 0 80px rgba(0,0,0,0.3)" }}
        >
          India&apos;s Most Trusted
          <br />
          <span style={{
            background: "linear-gradient(135deg,#C9A24B,#e8c97a,#C9A24B)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
          }}>AI Real Estate Platform</span>
        </h1>
        <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10">
          AI-Powered Intelligence. RERA-Verified Listings. Honest Pricing — Always.
        </p>

        {/* Search card */}
        <div className="mx-auto max-w-5xl">
          <div className="bg-white rounded-2xl p-5 shadow-2xl">

            {/* Row 1: City, Area, Area Size */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">

              {/* Step 1 – City */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  <span className="text-yellow-600">①</span> City
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
                  <span className="text-yellow-600">②</span> Area / Locality
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
                  <span className="text-yellow-600">③</span> Area Size (sq.ft)
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
                  <span className="text-yellow-600">④</span> Property Type
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
                  <span className="text-yellow-600">⑤</span> Budget <span className="normal-case text-gray-300 font-normal">(optional)</span>
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
                className="flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl text-black font-bold text-sm transition-all hover:opacity-90 w-full"
                style={{ background: "#C9A24B" }}
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
              <p className="text-2xl font-bold" style={{ color: "#C9A24B", fontFamily: "var(--font-playfair, Georgia, serif)" }}>{val}</p>
              <p className="text-white/70 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
