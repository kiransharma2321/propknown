"use client";

import { useEffect, useRef, useState } from "react";
import PropertyCard, { type PropertyCardProps } from "@/components/ui/PropertyCard";

const SKELETON_COUNT = 6;

// Mirrors PropertyCard's own DOM shape (card-dark wrapper, aspect-[4/3] image, p-4 info block)
// so the swap-in doesn't visibly jump. Shown while /api/featured-properties is in flight -- for
// most visitors (this section is the 6th of 13, well below the fold) the fetch will already be
// done by the time they scroll here, but it needs to look right on a slow connection too.
function PropertyCardSkeleton() {
  return (
    <div className="card-dark animate-pulse" aria-hidden="true">
      <div className="aspect-[4/3] bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-2/5 bg-gray-200 rounded" />
        <div className="h-4 w-4/5 bg-gray-200 rounded" />
        <div className="h-3 w-1/3 bg-gray-200 rounded" />
        <div className="h-3 w-3/5 bg-gray-200 rounded mt-2" />
        <div className="h-5 w-2/5 bg-gray-200 rounded mt-2" />
      </div>
    </div>
  );
}

export default function FeaturedPropertiesGrid() {
  const [properties, setProperties] = useState<PropertyCardProps[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Gated on IntersectionObserver rather than firing on mount -- this section is 6th of 13, so
  // fetching immediately meant it competed on the main thread with Header/ClientProviders/Hero/
  // ChatLauncher/WhatsAppButton all hydrating at the same time, measurably raising TBT even
  // though the fetch itself is tiny. rootMargin gives it a 200px head start before it's actually
  // visible, so it's very likely already resolved by the time a visitor scrolls this far.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        fetch("/api/featured-properties")
          .then(r => r.json())
          .then(d => { if (!cancelled) setProperties(d.properties ?? []); })
          .catch(() => { if (!cancelled) setProperties([]); });
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(el);

    return () => { cancelled = true; observer.disconnect(); };
  }, []);

  return (
    <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties === null
        ? Array.from({ length: SKELETON_COUNT }).map((_, i) => <PropertyCardSkeleton key={i} />)
        : properties.map((p) => <PropertyCard key={p.id} {...p} />)}
    </div>
  );
}
