"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  MapPin, Bed, Bath, Maximize, Star, CheckCircle,
  ChevronLeft, ChevronRight, MessageCircle, Phone, Send,
  Building2, TrendingUp, AlertCircle, Globe,
} from "lucide-react";
import type { Listing } from "@/lib/listings";
import { COMPANY } from "@/lib/utils";
import CostCalculator from "@/components/ui/CostCalculator";
import VerificationBadge from "@/components/ui/VerificationBadge";

// Leaflet map — no SSR
const PropertyMap = dynamic(() => import("@/components/property/PropertyMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-xl bg-gray-100 animate-pulse flex items-center justify-center" style={{ height: "420px" }}>
      <p className="text-gray-400 text-sm">Loading map…</p>
    </div>
  ),
});

// ── Types ─────────────────────────────────────────────────────────────────────
interface Amenity {
  name: string;
  category: "hospital" | "school" | "mall" | "transit" | "restaurant";
  lat: number;
  lng: number;
  distance: number;
}

interface MarketData {
  currentPricePerSqft: number;
  pricePerSqftUnit: string;
  yoyGrowth: number;
  trend: "rising" | "stable" | "cooling";
  outlook: string;
  dataSource: "real_data" | "ai_only";
}

interface NearbyListing {
  id: string;
  title: string;
  display: string;
  lat: number;
  lng: number;
  type: string;
  location: string;
  aiScore?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(lat2 - lat1);
  const dLon = r(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type OsmTags = Record<string, string>;

function classifyAmenity(tags: OsmTags): Amenity["category"] | null {
  if (["hospital", "clinic", "pharmacy", "doctors"].includes(tags.amenity ?? "")) return "hospital";
  if (["school", "college", "university", "kindergarten"].includes(tags.amenity ?? "")) return "school";
  if (tags.amenity === "bus_station" || tags.public_transport === "station" ||
      tags.railway === "station" || tags.railway === "subway_entrance") return "transit";
  if (["restaurant", "fast_food", "cafe", "food_court"].includes(tags.amenity ?? "")) return "restaurant";
  if (["mall", "supermarket", "department_store", "hypermarket"].includes(tags.shop ?? "")) return "mall";
  return null;
}

const AMENITY_LABELS: Record<Amenity["category"], string> = {
  hospital:   "Hospitals & Clinics",
  school:     "Schools & Colleges",
  mall:       "Shopping & Malls",
  transit:    "Metro, Bus & Transit",
  restaurant: "Restaurants & Cafes",
};

const AMENITY_EMOJI: Record<Amenity["category"], string> = {
  hospital:   "🏥",
  school:     "🏫",
  mall:       "🛒",
  transit:    "🚇",
  restaurant: "🍽️",
};

function fmtDist(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

const GOLD = "#C9A24B";

// ── Component ─────────────────────────────────────────────────────────────────
export default function PropertyDetailClient({
  listing,
  nearbyListings,
}: {
  listing: Listing;
  nearbyListings: Listing[];
}) {
  const [imgIdx,  setImgIdx]  = useState(0);
  const [coords,  setCoords]  = useState<{ lat: number; lng: number } | null>(
    listing.lat && listing.lng ? { lat: listing.lat, lng: listing.lng } : null
  );
  const [amenities,        setAmenities]       = useState<Amenity[]>([]);
  const [amenitiesLoading, setAmenitiesLoading]= useState(false);
  const [marketData,       setMarketData]      = useState<MarketData | null>(null);
  const [form,  setForm]  = useState({ name: "", phone: "", message: "" });
  const [fstate, setFstate] = useState<"idle" | "loading" | "success" | "error">("idle");

  const imgs = listing.images?.length ? listing.images : [
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
  ];
  const waText = encodeURIComponent(
    `Hi PropKnown, I'm interested in "${listing.title}" (${listing.location}, ${listing.display}). Please share details and arrange a visit.`
  );

  // ── Geocode if no coords ──────────────────────────────────────────────────
  useEffect(() => {
    if (coords) return;
    fetch(`/api/geocode?q=${encodeURIComponent(listing.location + " " + listing.city)}`)
      .then(r => r.json())
      .then(d => { if (d.lat && d.lon) setCoords({ lat: d.lat, lng: d.lon }); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Overpass amenities ────────────────────────────────────────────────────
  useEffect(() => {
    if (!coords) return;
    setAmenitiesLoading(true);
    const { lat, lng } = coords;
    const q = `[out:json][timeout:15];
(
  node(around:3000,${lat},${lng})[amenity=hospital];
  node(around:3000,${lat},${lng})[amenity=clinic];
  node(around:3000,${lat},${lng})[amenity=school];
  node(around:3000,${lat},${lng})[amenity=college];
  node(around:3000,${lat},${lng})[amenity=restaurant];
  node(around:3000,${lat},${lng})[amenity=fast_food];
  node(around:3000,${lat},${lng})[amenity=bus_station];
  node(around:3000,${lat},${lng})[railway=station];
  node(around:3000,${lat},${lng})[railway=subway_entrance];
  node(around:3000,${lat},${lng})[shop=mall];
  node(around:3000,${lat},${lng})[shop=supermarket];
);
out body qt 30;`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);

    fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(q)}`,
      signal: ctrl.signal,
    })
      .then(r => r.json())
      .then((data: { elements?: { lat: number; lon: number; tags?: OsmTags }[] }) => {
        clearTimeout(timer);
        const seen = new Set<string>();
        const list: Amenity[] = [];
        for (const el of data.elements ?? []) {
          const cat = classifyAmenity(el.tags ?? {});
          if (!cat) continue;
          const name = el.tags?.name || el.tags?.["name:en"] || "";
          if (!name || seen.has(name)) continue;
          seen.add(name);
          list.push({
            name, category: cat,
            lat: el.lat, lng: el.lon,
            distance: haversineM(lat, lng, el.lat, el.lon),
          });
        }
        // Top 3 per category, sorted by distance
        const grouped: Partial<Record<Amenity["category"], Amenity[]>> = {};
        for (const a of list) {
          if (!grouped[a.category]) grouped[a.category] = [];
          grouped[a.category]!.push(a);
        }
        const result: Amenity[] = [];
        for (const grp of Object.values(grouped)) {
          result.push(...(grp ?? []).sort((a, b) => a.distance - b.distance).slice(0, 3));
        }
        setAmenities(result);
      })
      .catch(() => {})
      .finally(() => setAmenitiesLoading(false));

    return () => ctrl.abort();
  }, [coords]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Area price insight ────────────────────────────────────────────────────
  useEffect(() => {
    const typeMap: Record<string, string> = {
      Apartment: "apartment", Villa: "villa", Penthouse: "apartment",
      Plot: "plot", "Farm Land": "agriculture", Commercial: "commercial",
    };
    const unitMap: Record<string, string> = {
      Plot: "sqyard", "Farm Land": "acres",
    };
    const propType = typeMap[listing.type] ?? "apartment";
    const unit = unitMap[listing.type] ?? "sqft";

    fetch("/api/market-intel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location: listing.location, propertyType: propType, unit }),
    })
      .then(r => r.json())
      .then(d => setMarketData(d))
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lead form submit ──────────────────────────────────────────────────────
  const submitLead = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setFstate("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          message: form.message || `Enquiry about: ${listing.title} (${listing.display})`,
          source: "property-detail",
          propertyId: listing.id,
        }),
      });
      setFstate(res.ok ? "success" : "error");
    } catch {
      setFstate("error");
    }
  }, [form, listing]);

  // Nearby pins for map (only those with coords)
  const nearbyPins: NearbyListing[] = nearbyListings
    .filter(l => l.lat && l.lng)
    .map(l => ({
      id: l.id, title: l.title, display: l.display, type: l.type,
      lat: l.lat!, lng: l.lng!, location: l.location, aiScore: l.aiScore,
    }));

  const amenityGroups = (
    ["hospital", "school", "mall", "transit", "restaurant"] as Amenity["category"][]
  )
    .map(cat => ({ cat, items: amenities.filter(a => a.category === cat) }))
    .filter(g => g.items.length > 0);

  const trendColor = marketData?.trend === "rising" ? "#22c55e"
    : marketData?.trend === "cooling" ? "#ef4444" : "#C9A24B";

  return (
    <div className="pt-28 pb-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          <span>/</span>
          <Link href="/buy" className="hover:text-gray-700">Buy Properties</Link>
          <span>/</span>
          <span className="text-gray-700 truncate max-w-[200px]">{listing.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Photo gallery */}
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgs[imgIdx]}
                alt={listing.title}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
              {imgs.length > 1 && (
                <>
                  <button
                    onClick={() => setImgIdx(i => (i - 1 + imgs.length) % imgs.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition"
                  ><ChevronLeft size={18} /></button>
                  <button
                    onClick={() => setImgIdx(i => (i + 1) % imgs.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition"
                  ><ChevronRight size={18} /></button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {imgs.map((_, i) => (
                      <button key={i} onClick={() => setImgIdx(i)}
                        className="w-2 h-2 rounded-full transition-all"
                        style={{ background: i === imgIdx ? GOLD : "rgba(255,255,255,0.5)" }} />
                    ))}
                  </div>
                </>
              )}
              {listing.badge && (
                <div className="absolute top-4 left-4">
                  <span className="bg-white/95 border border-green-200 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <CheckCircle size={12} /> {listing.badge}: {listing.badgeNo}
                  </span>
                </div>
              )}
              {listing.aiScore && (
                <div className="absolute top-4 right-4 bg-black/80 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                  <Star size={12} fill={GOLD} style={{ color: GOLD }} />
                  <span className="text-sm font-bold" style={{ color: GOLD }}>AI {listing.aiScore}</span>
                </div>
              )}
            </div>

            {/* Title + basics */}
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs font-bold px-3 py-1 rounded-full border" style={{ background: "rgba(201,162,75,0.08)", borderColor: "rgba(201,162,75,0.3)", color: GOLD }}>
                  {listing.type}
                </span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${["Ready to Move","Ready","Available"].includes(listing.status) ? "bg-green-50 text-green-700 border border-green-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
                  {listing.status}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
                {listing.title}
              </h1>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                <MapPin size={14} />
                <span>{listing.location}, {listing.city}</span>
              </div>
              <p className="text-3xl font-bold mb-5" style={{ color: GOLD, fontFamily: "var(--font-playfair,Georgia,serif)" }}>
                {listing.display}
              </p>

              {/* Key stats */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 pb-5 border-b border-gray-100">
                {(listing.beds ?? 0) > 0 && (
                  <span className="flex items-center gap-2"><Bed size={15} className="text-gray-400" />{listing.beds} Bedrooms</span>
                )}
                {(listing.baths ?? 0) > 0 && (
                  <span className="flex items-center gap-2"><Bath size={15} className="text-gray-400" />{listing.baths} Bathrooms</span>
                )}
                {(listing.sqft ?? 0) > 0 && (
                  <span className="flex items-center gap-2"><Maximize size={15} className="text-gray-400" />{listing.sqft?.toLocaleString()} sqft</span>
                )}
                {listing.floor && <span className="flex items-center gap-2"><Building2 size={15} className="text-gray-400" />{listing.floor}</span>}
                {listing.facing && <span className="flex items-center gap-2">🧭 {listing.facing} Facing</span>}
              </div>
            </div>

            {/* Description */}
            {listing.description && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">About this property</h2>
                <p className="text-gray-600 leading-relaxed">{listing.description}</p>
              </div>
            )}

            {/* Features */}
            {listing.features && listing.features.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">Features & Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {listing.features.map(f => (
                    <span key={f} className="flex items-center gap-1.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
                      <CheckCircle size={12} className="text-green-500 shrink-0" /> {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── TRUE COST CALCULATOR ── */}
            <CostCalculator initialPrice={listing.price} compact />

            {/* ── MAP ── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-bold text-gray-900">Location & Nearby</h2>
                {nearbyPins.length > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "rgba(201,162,75,0.1)", color: GOLD }}>
                    + {nearbyPins.length} PropKnown listings nearby
                  </span>
                )}
              </div>

              {coords ? (
                <PropertyMap
                  key={`${coords.lat},${coords.lng}`}
                  lat={coords.lat}
                  lng={coords.lng}
                  title={listing.title}
                  display={listing.display}
                  nearbyListings={nearbyPins}
                  amenities={amenities}
                />
              ) : (
                <div className="w-full rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center" style={{ height: "420px" }}>
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-yellow-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Locating on map…</p>
                  </div>
                </div>
              )}

              {/* Map legend */}
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: GOLD }} /> This property
                </span>
                {nearbyPins.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm inline-block bg-gray-900 border border-yellow-500" /> Nearby PropKnown listings
                  </span>
                )}
                {amenities.length > 0 && (
                  <span className="flex items-center gap-1.5">🏥🏫🛒 Nearby amenities</span>
                )}
              </div>
            </div>

            {/* ── AMENITIES SECTION ── */}
            {(amenitiesLoading || amenityGroups.length > 0) && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Nearby Places</h2>
                {amenitiesLoading && amenityGroups.length === 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {amenityGroups.map(({ cat, items }) => (
                      <div key={cat} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
                          <span className="text-xl">{AMENITY_EMOJI[cat]}</span>
                          {AMENITY_LABELS[cat]}
                        </div>
                        <ul className="space-y-1.5">
                          {items.map(a => (
                            <li key={a.name} className="flex items-center justify-between text-xs">
                              <span className="text-gray-700 truncate flex-1 mr-2">{a.name}</span>
                              <span className="text-gray-400 shrink-0">{fmtDist(a.distance)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
                {!amenitiesLoading && amenityGroups.length === 0 && (
                  <p className="text-gray-400 text-sm italic">Amenity data not available for this area.</p>
                )}
              </div>
            )}

            {/* ── SIMILAR PROPERTIES NEARBY ── */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Similar PropKnown Listings Nearby</h2>
              {nearbyListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {nearbyListings.map(p => (
                    <div key={p.id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-yellow-400 hover:shadow-md transition-all group">
                      <div className="aspect-[16/9] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.images[0]}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                          <MapPin size={10} />{p.location}
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 line-clamp-1 mb-1">{p.title}</h3>
                        <div className="flex items-center justify-between">
                          <p className="font-bold" style={{ color: GOLD }}>{p.display}</p>
                          {p.aiScore && (
                            <span className="flex items-center gap-1 text-xs font-bold" style={{ color: GOLD }}>
                              <Star size={11} fill={GOLD} />AI {p.aiScore}
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/buy/${p.id}`}
                          className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg border transition-all hover:bg-gray-50"
                          style={{ borderColor: "rgba(201,162,75,0.4)", color: GOLD }}
                        >
                          <Building2 size={12} /> View Details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 text-center">
                  <p className="text-gray-600 text-sm mb-3">
                    More PropKnown listings coming to this area soon — WhatsApp us for off-market options.
                  </p>
                  <a
                    href={`https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent("Hi PropKnown! I'm looking for properties near " + listing.location + ". Do you have any off-market options?")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-white text-xs font-semibold px-5 py-2.5 rounded-lg"
                    style={{ background: "#25D366" }}
                  >
                    <MessageCircle size={14} /> Ask for Off-Market Options
                  </a>
                </div>
              )}
            </div>

          </div>

          {/* ── RIGHT SIDEBAR (sticky) ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 space-y-5">

              {/* WhatsApp CTA */}
              <a
                href={`https://wa.me/${COMPANY.whatsapp}?text=${waText}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white text-base shadow-lg transition-all hover:opacity-90"
                style={{ background: "#25D366" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Enquire on WhatsApp
              </a>

              <a
                href={`tel:${COMPANY.phone}`}
                className="flex items-center justify-center gap-3 w-full py-3.5 rounded-2xl font-semibold text-sm border-2 transition-all hover:bg-gray-50"
                style={{ borderColor: "rgba(201,162,75,0.5)", color: GOLD }}
              >
                <Phone size={16} /> Call {COMPANY.phone}
              </a>

              {/* Lead form */}
              <div className="border border-gray-200 rounded-2xl p-5">
                <h3 className="text-gray-900 font-bold text-base mb-1">Request a Callback</h3>
                <p className="text-gray-400 text-xs mb-4">We respond within 2 hours.</p>

                {fstate === "success" ? (
                  <div className="text-center py-6">
                    <CheckCircle size={36} className="text-green-500 mx-auto mb-3" />
                    <p className="font-semibold text-gray-800">Request sent!</p>
                    <p className="text-sm text-gray-500 mt-1">Raghu will call you within 2 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={submitLead} className="space-y-3">
                    <input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Your Name *"
                      required
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-yellow-400 placeholder-gray-400"
                    />
                    <input
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="Phone Number *"
                      required type="tel"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-yellow-400 placeholder-gray-400"
                    />
                    <textarea
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Message (optional)"
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-yellow-400 placeholder-gray-400 resize-none"
                    />
                    {fstate === "error" && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle size={12} /> Something went wrong. WhatsApp us instead.
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={fstate === "loading"}
                      className="w-full py-3 rounded-xl text-black font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                      style={{ background: GOLD }}
                    >
                      {fstate === "loading" ? (
                        <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Sending…</>
                      ) : (
                        <><Send size={14} /> Send Request</>
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* Area Price Insight */}
              <div className="border border-gray-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} style={{ color: GOLD }} />
                  <h3 className="text-gray-900 font-bold text-sm">Area Price Insight</h3>
                </div>
                {marketData ? (
                  <>
                    <div className="flex items-end gap-2 mb-2">
                      <p className="text-2xl font-bold" style={{ color: GOLD }}>
                        ₹{marketData.currentPricePerSqft.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400 mb-1">/ {marketData.pricePerSqftUnit ?? "sqft"} avg</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm mb-3">
                      <span className="font-semibold" style={{ color: trendColor }}>
                        {marketData.trend === "rising" ? "↑" : marketData.trend === "cooling" ? "↓" : "→"} {marketData.trend}
                      </span>
                      {marketData.yoyGrowth > 0 && (
                        <span className="text-gray-500">· {marketData.yoyGrowth}% YoY</span>
                      )}
                      {marketData.dataSource === "real_data" && (
                        <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(34,197,94,0.08)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.3)" }}>
                          <Globe size={9} /> Real data
                        </span>
                      )}
                    </div>
                    {marketData.outlook && (
                      <p className="text-xs text-gray-500 leading-relaxed">{marketData.outlook}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-3 italic leading-relaxed">
                      AI-estimated area average — indicative only. Verify with RERA and PropKnown agent before any decision.
                    </p>
                  </>
                ) : (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: i === 1 ? "60%" : i === 2 ? "80%" : "40%" }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Verification badges */}
              <VerificationBadge
                flags={{
                  reraVerified: listing.badge === "RERA",
                  reraNumber: listing.badge === "RERA" ? listing.badgeNo : undefined,
                  layoutApproved: listing.badge === "HMDA" || listing.badge === "DTCP",
                  layoutBadge: (listing.badge === "HMDA" || listing.badge === "DTCP") ? listing.badge : undefined,
                }}
              />

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
