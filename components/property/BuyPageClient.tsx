"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, MapPin, ChevronDown, MessageCircle, Star, CheckCircle, Building2, X, Clock, GitCompare } from "lucide-react";
import SmartLeadForm from "@/components/ui/SmartLeadForm";
import { useComparison, type CompareItem } from "@/components/comparison/ComparisonContext";
import CurrencyPrice from "@/components/ui/CurrencyPrice";
import FavoriteButton from "@/components/buyer/FavoriteButton";
import VerificationBadge from "@/components/ui/VerificationBadge";

const LISTINGS = [
  { id:"aparna",    title:"Aparna Sarovar Grande 3BHK", location:"Nallagandla",  city:"Hyderabad",   display:"₹1.25 Cr",    price:12500000, sqft:1950, beds:3, baths:3, floor:"8th Floor",   facing:"East",      status:"Ready to Move",      badge:"RERA", badgeNo:"P02400006789", aiScore:8.4, type:"Apartment",  img:"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80" },
  { id:"bhooja",    title:"My Home Bhooja 3BHK",        location:"Kokapet",      city:"Hyderabad",   display:"₹3.5 Cr",     price:35000000, sqft:2850, beds:3, baths:3, floor:"15th Floor",  facing:"West",      status:"Ready to Move",      badge:"RERA", badgeNo:"P02400008234", aiScore:9.2, type:"Apartment",  img:"https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80" },
  { id:"prestige",  title:"Prestige Falcon City 2BHK",  location:"Gachibowli",  city:"Hyderabad",   display:"₹85 Lakhs",   price:8500000,  sqft:1250, beds:2, baths:2, floor:"4th Floor",   facing:"North",     status:"Under Construction", badge:"RERA", badgeNo:"P02400004521", aiScore:7.8, type:"Apartment",  img:"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80" },
  { id:"hmda-plot", title:"HMDA Prime Corner Plot",      location:"Kollur",       city:"Hyderabad",   display:"₹45 Lakhs",   price:4500000,  sqft:1800, beds:0, baths:0, floor:"Ground",      facing:"East",      status:"Ready",              badge:"HMDA", badgeNo:"LP245/2024",   aiScore:8.1, type:"Plot",       extra:"200 sqyd · 4 Guntas · 30ft Road", img:"https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80" },
  { id:"vasavi",    title:"Vasavi Signature Villa 4BHK", location:"Nallagandla", city:"Hyderabad",   display:"₹2.8 Cr",     price:28000000, sqft:3200, beds:4, baths:4, floor:"G+2",         facing:"North-East",status:"Ready to Move",      badge:"RERA", badgeNo:"P02400007123", aiScore:8.8, type:"Villa",      extra:"200 sqyd · Vastu Compliant", img:"https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=80" },
  { id:"farmland",  title:"Managed Farm Land",           location:"Shankarpally",city:"Rangareddy",  display:"₹25L/acre",   price:2500000,  sqft:87120,beds:0, baths:0, floor:"Ground",      facing:"East",      status:"Available",          badge:"PATTA",badgeNo:"Patta Available",aiScore:7.5, type:"Farm Land",  extra:"2 acres min · Borewell · Road Access", img:"https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80" },
  { id:"kompally",  title:"Commercial Shop — Kompally",  location:"Kompally",    city:"Hyderabad",   display:"₹65 Lakhs",   price:6500000,  sqft:450,  beds:0, baths:1, floor:"Ground Floor",facing:"Main Road", status:"Ready",              badge:"RERA", badgeNo:"P02400003344", aiScore:7.9, type:"Commercial", extra:"High Footfall · Corner Shop", img:"https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80" },
  { id:"rajapushpa",title:"Rajapushpa Provincia 3BHK",   location:"Kokapet",     city:"Hyderabad",   display:"₹1.95 Cr",    price:19500000, sqft:2100, beds:3, baths:3, floor:"10th Floor",  facing:"South-West",status:"Ready to Move",      badge:"RERA", badgeNo:"P02400005678", aiScore:8.6, type:"Apartment",  img:"https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80" },
];

const CITIES  = ["All Cities","Hyderabad","Bangalore","Mumbai","Pune","Chennai","Delhi NCR","Dubai","Singapore","London","Toronto"];
const TYPES   = ["All Types","Apartment","Villa","House","Commercial","Plot","Agriculture Land","Farm Land"];
const BUDGETS = ["Any Budget","Under ₹50L","₹50L–1Cr","₹1Cr–2Cr","₹2Cr–5Cr","Above ₹5Cr"];

function scoreColor(s: number) { return s >= 9 ? "#22c55e" : s >= 8 ? "#8a6a2e" : "#94a3b8"; }

export interface Submission {
  id: string; title: string; propType: string; bhk?: string;
  size?: string; sizeUnit?: string; priceDisplay: string;
  city: string; area: string; reraNumber?: string;
  photoIds: string[]; videoIds: string[]; videoUrls: string[];
  verificationFlags?: import("@/components/ui/VerificationBadge").VerificationFlags;
  constructionPct?: number;
  createdAt: string;
}

function SubmissionCard({ s }: { s: Submission }) {
  const firstPhoto = s.photoIds[0] ? `/api/files/${s.photoIds[0]}` : null;
  const waMsg = `https://wa.me/919701771333?text=${encodeURIComponent(`Hi, I'm interested in "${s.title}" at ${s.area}, ${s.city}. Asking: ${s.priceDisplay}`)}`;
  const { add, remove, isAdded } = useComparison();
  const added = isAdded(`sub-${s.id}`);

  const compareItem: CompareItem = {
    id: `sub-${s.id}`, title: s.title,
    price: 0, priceDisplay: s.priceDisplay,
    location: s.area, city: s.city, type: s.propType,
    image: firstPhoto ?? undefined,
    beds: s.bhk ? parseInt(s.bhk) || undefined : undefined,
    sqft: s.size ? parseFloat(s.size) || undefined : undefined,
    reraNumber: s.reraNumber,
    source: "submission",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-yellow-400 hover:shadow-lg transition-all group flex flex-col">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {firstPhoto ? (
          <Image src={firstPhoto} alt={`${s.title} — ${s.propType} in ${s.area}, ${s.city}`} fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Building2 size={40} />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded">
            {s.reraNumber ? "✓ RERA" : "Owner Listed"}
          </span>
        </div>
        <div className="absolute top-2 right-2">
          <span className="flex items-center gap-1 bg-black/70 text-xs font-bold px-2 py-1 rounded-full text-gray-200">
            <Clock size={9} /> New
          </span>
        </div>
        <FavoriteButton
          listingId={`sub-${s.id}`}
          title={s.title}
          priceDisplay={s.priceDisplay}
          location={`${s.area}, ${s.city}`}
          image={firstPhoto ?? undefined}
          className="absolute bottom-2 right-2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm"
        />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-gray-900 font-bold text-sm mb-1 line-clamp-1">{s.title}</h3>
        <div className="flex items-center gap-1 text-gray-400 text-xs mb-2"><MapPin size={10} />{s.area}, {s.city}</div>
        <p className="text-xl font-bold mb-2" style={{ color:"#8a6a2e", fontFamily:"var(--font-playfair,Georgia,serif)" }}>{s.priceDisplay}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-2">
          {s.bhk && <span>{s.bhk}</span>}
          {s.size && <span>{s.size} {s.sizeUnit}</span>}
          <span className="text-gray-400">{s.propType}</span>
        </div>
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          <VerificationBadge compact flags={s.verificationFlags ?? {}} />
          {s.constructionPct != null && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
              🏗 {s.constructionPct}% built
            </span>
          )}
        </div>
        <button
          onClick={() => added ? remove(`sub-${s.id}`) : add(compareItem)}
          className="w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold py-1.5 rounded-lg mb-2 border transition-all"
          style={added
            ? { background:"rgba(201,162,75,0.15)", color:"#8a6a2e", borderColor:"rgba(201,162,75,0.5)" }
            : { background:"transparent", color:"#6b7280", borderColor:"#e5e7eb" }
          }
        >
          <GitCompare size={10} />
          {added ? "✓ In comparison" : "Add to compare"}
        </button>
        <div className="mt-auto flex gap-2">
          <a href={waMsg} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all"
            style={{ background:"rgba(201,162,75,0.12)", color:"#8a6a2e", border:"1px solid rgba(201,162,75,0.3)" }}>
            <MessageCircle size={12} /> Enquire
          </a>
          <Link href={`/buy/submission/${s.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all border border-gray-200">
            <Building2 size={12} /> Details
          </Link>
        </div>
      </div>
    </div>
  );
}

function BuyPageInner({ initialSubmissions }: { initialSubmissions: Submission[] }) {
  const searchParams = useSearchParams();

  const { add, remove, isAdded } = useComparison();
  const [city,        setCity]        = useState(searchParams.get("city")   || "All Cities");
  const [area,        setArea]        = useState(searchParams.get("area")   || "");
  const [type,        setType]        = useState(searchParams.get("type")   || "All Types");
  const [budget,      setBudget]      = useState(searchParams.get("budget") || "Any Budget");
  // Server-fetched at request time and passed in as a prop (see page.tsx) rather than fetched
  // here via useEffect -- previously, owner-submitted listings were entirely absent from the
  // initial server-rendered HTML (only ever appearing after client-side hydration + fetch
  // completed), which meant they were invisible to crawlers and caused a visible pop-in for
  // real visitors. The static LISTINGS above were already fully server-rendered despite this
  // page being "use client" -- Next.js SSRs client components' initial output by default, only
  // hydration/interactivity is client-only -- so submissions were the one genuine gap.
  const [submissions] = useState<Submission[]>(initialSubmissions);

  useEffect(() => {
    const c = searchParams.get("city"), a = searchParams.get("area"),
          t = searchParams.get("type"), b = searchParams.get("budget");
    if (c) setCity(c); if (a) setArea(a); if (t) setType(t); if (b) setBudget(b);
  }, [searchParams]);

  const isSearchActive = city !== "All Cities" || area.trim() !== "" || type !== "All Types" || budget !== "Any Budget";

  const budgetOk = (p: number) => {
    if (budget === "Any Budget")  return true;
    if (budget === "Under ₹50L") return p < 5000000;
    if (budget === "₹50L–1Cr")  return p >= 5000000  && p < 10000000;
    if (budget === "₹1Cr–2Cr")  return p >= 10000000 && p < 20000000;
    if (budget === "₹2Cr–5Cr")  return p >= 20000000 && p < 50000000;
    if (budget === "Above ₹5Cr") return p >= 50000000;
    return true;
  };

  const filtered = LISTINGS.filter(p => {
    if (city !== "All Cities" && !p.city.toLowerCase().includes(city.toLowerCase())) return false;
    const a = area.trim().toLowerCase();
    if (a && !p.location.toLowerCase().includes(a) && !p.title.toLowerCase().includes(a)) return false;
    if (type !== "All Types" && p.type !== type) return false;
    return budgetOk(p.price);
  });

  const filteredSubs = submissions.filter(s => {
    if (city !== "All Cities" && !s.city.toLowerCase().includes(city.toLowerCase())) return false;
    const a = area.trim().toLowerCase();
    if (a && !s.area.toLowerCase().includes(a) && !s.title.toLowerCase().includes(a)) return false;
    if (type !== "All Types" && s.propType !== type) return false;
    return true;
  });

  const clearAll = () => { setCity("All Cities"); setArea(""); setType("All Types"); setBudget("Any Budget"); };

  const totalCount = filtered.length + filteredSubs.length;

  const sel = "border border-gray-300 text-gray-900 text-sm rounded-lg py-2.5 px-3 pr-8 focus:outline-none focus:border-yellow-500 appearance-none bg-white";
  const inp = "border border-gray-300 text-gray-900 text-sm rounded-lg py-2.5 px-3 focus:outline-none focus:border-yellow-500 placeholder-gray-400 bg-white";

  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-10">
          <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color:"#8a6a2e" }}>Property Search</p>
          <h1 className="section-heading" style={{ fontFamily:"var(--font-playfair,Georgia,serif)" }}>
            Verified Properties, <span className="gold-text">Zero Guesswork</span>
          </h1>
          <p className="text-gray-500 mt-3">
            {isSearchActive ? `${totalCount} matching properties` : `${LISTINGS.length + submissions.length} verified properties`}
            {" "}· RERA / HMDA registered · AI-scored
          </p>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-8 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5" htmlFor="buy-filter-city">① City</label>
              <div className="relative">
                <select id="buy-filter-city" value={city} onChange={e => setCity(e.target.value)} className={`w-full ${sel}`}>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5" htmlFor="buy-filter-area">② Area / Locality</label>
              <div className="relative">
                <input id="buy-filter-area" value={area} onChange={e => setArea(e.target.value)} placeholder="Kokapet, Gachibowli…" className={`w-full ${inp} pr-7`} />
                {area && <button onClick={() => setArea("")} aria-label="Clear area filter" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"><X size={13} /></button>}
              </div>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5" htmlFor="buy-filter-type">③ Property Type</label>
              <div className="relative">
                <select id="buy-filter-type" value={type} onChange={e => setType(e.target.value)} className={`w-full ${sel}`}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5" htmlFor="buy-filter-budget">④ Budget</label>
              <div className="relative">
                <select id="buy-filter-budget" value={budget} onChange={e => setBudget(e.target.value)} className={`w-full ${sel}`}>
                  {BUDGETS.map(b => <option key={b}>{b}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            {isSearchActive && (
              <button onClick={clearAll} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 border border-gray-300 rounded-lg px-3 py-2.5 transition-colors whitespace-nowrap">
                <X size={13} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Smart Buyer Form */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 sm:p-8 mb-10 shadow-sm">
          <div className="max-w-3xl">
            <SmartLeadForm formType="buy" source="buy-page" title="Find Your Perfect Property"
              subtitle="Tell us what you're looking for — we'll match you with verified listings and call back within 2 hours." />
          </div>
        </div>

        {/* Approved Submissions (owner-listed) */}
        {filteredSubs.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-gray-900 font-bold text-lg">Owner-Listed Properties</h2>
              <span className="bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full">{filteredSubs.length} new</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredSubs.map(s => (
                <SubmissionCard key={s.id} s={s} />
              ))}
            </div>
          </div>
        )}

        {/* Curated Listings */}
        {filtered.length > 0 && (
          <div>
            {filteredSubs.length > 0 && (
              <h2 className="text-gray-900 font-bold text-lg mb-5">Curated Listings</h2>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map(p => {
                const waMsg = `https://wa.me/919701771333?text=${encodeURIComponent(`Hi, I'm interested in "${p.title}" at ${p.location}. RERA/Badge: ${p.badgeNo}`)}`;
                const added = isAdded(p.id);
                const compareItem: CompareItem = {
                  id: p.id, title: p.title, price: p.price, priceDisplay: p.display,
                  sqft: p.sqft, beds: p.beds > 0 ? p.beds : undefined,
                  location: p.location, city: p.city, type: p.type,
                  image: p.img, aiScore: p.aiScore,
                  reraNumber: p.badge === "RERA" ? p.badgeNo : undefined,
                  badge: p.badge, status: p.status, source: "curated",
                };
                return (
                  <div key={p.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-yellow-400 hover:shadow-lg transition-all group flex flex-col">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image src={p.img} alt={`${p.title} — ${p.type} in ${p.location}, ${p.city}`} fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-2 left-2">
                        <span className="bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded">✓ {p.badge}</span>
                      </div>
                      <div className="absolute top-2 right-2">
                        <span className="flex items-center gap-1 bg-black/70 text-xs font-bold px-2 py-1 rounded-full" style={{ color: scoreColor(p.aiScore) }}>
                          <Star size={10} fill="currentColor" /> {p.aiScore}
                        </span>
                      </div>
                      <FavoriteButton
                        listingId={p.id}
                        title={p.title}
                        priceDisplay={p.display}
                        location={`${p.location}, ${p.city}`}
                        image={p.img}
                        className="absolute bottom-2 right-2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                      />
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="text-gray-900 font-bold text-sm mb-1 line-clamp-1">{p.title}</h3>
                      <div className="flex items-center gap-1 text-gray-400 text-xs mb-2"><MapPin size={10} />{p.location}, {p.city}</div>
                      <p className="mb-2" style={{ fontFamily:"var(--font-playfair,Georgia,serif)" }}>
                        <CurrencyPrice priceINR={p.price} className="text-xl font-bold text-[#8a6a2e]" />
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-1">
                        {p.beds > 0 && <span>{p.beds} BHK</span>}
                        {p.sqft > 0 && <span>{p.sqft.toLocaleString()} sqft</span>}
                        <span>{p.floor}</span><span>{p.facing}</span>
                      </div>
                      {"extra" in p && p.extra && <p className="text-xs text-gray-400 mb-2">{p.extra as string}</p>}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${["Ready to Move","Ready","Available"].includes(p.status) ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>{p.status}</span>
                        <CheckCircle size={12} className="text-green-500" />
                        <span className="text-[10px] text-gray-400 truncate">{p.badgeNo}</span>
                      </div>
                      <div className="mb-2">
                        <VerificationBadge
                          compact
                          flags={{
                            reraVerified: p.badge === "RERA",
                            reraNumber: p.badge === "RERA" ? p.badgeNo : undefined,
                            layoutApproved: p.badge === "HMDA" || p.badge === "DTCP",
                            layoutBadge: (p.badge === "HMDA" || p.badge === "DTCP") ? p.badge : undefined,
                          }}
                        />
                      </div>
                      <button
                        onClick={() => added ? remove(p.id) : add(compareItem)}
                        className="w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold py-1.5 rounded-lg mb-2 border transition-all"
                        style={added
                          ? { background:"rgba(201,162,75,0.15)", color:"#8a6a2e", borderColor:"rgba(201,162,75,0.5)" }
                          : { background:"transparent", color:"#6b7280", borderColor:"#e5e7eb" }
                        }
                      >
                        <GitCompare size={10} />
                        {added ? "✓ In comparison" : "Add to compare"}
                      </button>
                      <div className="mt-auto flex gap-2">
                        <a href={waMsg} target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all"
                          style={{ background:"rgba(201,162,75,0.12)", color:"#8a6a2e", border:"1px solid rgba(201,162,75,0.3)" }}>
                          <MessageCircle size={12} /> Enquire
                        </a>
                        <Link href={`/buy/${p.id}`} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all border border-gray-200">
                          <Building2 size={12} /> Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No results */}
        {filtered.length === 0 && filteredSubs.length === 0 && isSearchActive && (
          <div className="text-center py-24">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background:"rgba(201,162,75,0.1)", border:"1px solid rgba(201,162,75,0.3)" }}>
              <Search size={32} style={{ color:"#8a6a2e" }} />
            </div>
            <p className="text-gray-700 text-lg font-semibold mb-2">No properties listed in this area yet.</p>
            <p className="text-gray-500 text-base mb-8 max-w-md mx-auto">
              WhatsApp Raghu on <strong>97017 71333</strong> and we will find your perfect property for you.
            </p>
            <a href="https://wa.me/919701771333?text=Hi%20Raghu%2C%20I%20am%20looking%20for%20a%20property%20and%20need%20your%20help."
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white font-semibold px-8 py-3 rounded-xl shadow-md transition-all hover:opacity-90 text-sm"
              style={{ background:"#25D366" }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp Raghu — 97017 71333
            </a>
            <div className="mt-6">
              <button onClick={clearAll} className="text-sm font-medium" style={{ color:"#8a6a2e" }}>← Clear filters and show all listings</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BuyPageClient({ initialSubmissions }: { initialSubmissions: Submission[] }) {
  return <Suspense><BuyPageInner initialSubmissions={initialSubmissions} /></Suspense>;
}
