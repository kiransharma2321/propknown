"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { CATEGORIES, type Category, type Nearby } from "@/lib/geo";

// M7: map + nearby places, fetched only when scrolled into view (keeps the page fast and the
// free OpenStreetMap services lightly used).
interface Geo { mapUrl: string; nearby: Nearby | null; fetchedAt: string; attribution: string }

export default function AreaGeo({ area, city }: { area: string; city: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setState("loading");
      fetch(`/api/area-geo?area=${encodeURIComponent(area)}&city=${encodeURIComponent(city)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject())).then((j) => { setGeo(j); setState("done"); }).catch(() => setState("error"));
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [area, city]);

  return (
    <section ref={ref} className="mt-12">
      <h2 className="heading-h3 mb-1 flex items-center gap-2"><MapPin size={18} className="text-[#7A5C1A]" /> {area} on the map</h2>
      <p className="text-xs text-gray-500 mb-4">Nearby places within 3 km, from OpenStreetMap community data (may be incomplete).</p>
      {state === "error" && <p className="text-sm text-gray-500">The map couldn&apos;t load right now.</p>}
      {(state === "idle" || state === "loading") && <div className="h-72 rounded-2xl bg-gray-100 animate-pulse" aria-label="Loading map" />}
      {geo && (
        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <iframe title={`Map of ${area}, ${city}`} src={geo.mapUrl} loading="lazy" className="w-full h-72 lg:h-full min-h-[18rem] rounded-2xl border border-gray-200" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 content-start">
            {geo.nearby ? (Object.keys(CATEGORIES) as Category[]).map((k) => {
              const c = geo.nearby![k];
              return (
                <div key={k} className="card-dark p-3">
                  <p className="text-xs font-semibold text-gray-600">{CATEGORIES[k].label} <span className="font-normal text-gray-500">· {c.total} mapped within 3 km</span></p>
                  {c.nearest.length ? <ul className="text-sm mt-1">{c.nearest.slice(0, 3).map((p) => <li key={p.name} className="flex justify-between gap-2"><span className="truncate">{p.name}</span><span className="text-gray-500 shrink-0">{p.distanceKm} km</span></li>)}</ul> : <p className="text-xs text-gray-500 mt-1">None mapped nearby.</p>}
                </div>
              );
            }) : <p className="text-sm text-gray-500">Nearby places are unavailable right now.</p>}
          </div>
          <p className="text-[11px] text-gray-500 lg:col-span-2">Map and places: {geo.attribution}. Distances are straight-line. Fetched {new Date(geo.fetchedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.</p>
        </div>
      )}
    </section>
  );
}
