"use client";

import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

// Extracted verbatim from the old HeroSection.tsx during the homepage redesign -- same state,
// same handleSearch -> /buy, same styling. Only the surrounding section chrome (heading, bg)
// is new; this is no longer the hero, just a secondary search utility further down the page.

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

export default function PropertySearchSection() {
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
    <section className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-8">
          <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "var(--gold-text)" }}>Browse Listings</p>
          <h2 className="heading-h2">
            Search by <span className="gold-text">City &amp; Budget</span>
          </h2>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-sm">

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
    </section>
  );
}
