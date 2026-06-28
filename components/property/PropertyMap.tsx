"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";

interface NearbyListing {
  id: string;
  title: string;
  display: string;
  lat: number;
  lng: number;
  type: string;
}

interface Amenity {
  name: string;
  category: "hospital" | "school" | "mall" | "transit" | "restaurant";
  lat: number;
  lng: number;
  distance: number;
}

interface PropertyMapProps {
  lat: number;
  lng: number;
  title: string;
  display: string;
  nearbyListings: NearbyListing[];
  amenities: Amenity[];
}

const CATEGORY_EMOJI: Record<string, string> = {
  hospital:   "🏥",
  school:     "🏫",
  mall:       "🛒",
  transit:    "🚇",
  restaurant: "🍽️",
};

export default function PropertyMap({ lat, lng, title, display, nearbyListings, amenities }: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let isMounted = true;

    (async () => {
      const L = (await import("leaflet")).default;

      if (!isMounted || !containerRef.current) return;

      const map = L.map(containerRef.current, { zoomControl: true }).setView([lat, lng], 14);
      mapRef.current = map;

      // OSM tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // ── Main property marker (gold star pin) ──────────────────────────────
      const mainIcon = L.divIcon({
        className: "",
        html: `<div style="
          background:#C9A24B;color:#000;padding:6px 10px;border-radius:8px;
          font-weight:800;font-size:13px;white-space:nowrap;
          box-shadow:0 3px 12px rgba(0,0,0,0.35);
          border:2px solid #fff;
          display:flex;align-items:center;gap:4px;
        ">
          <span style="font-size:15px">⭐</span>
          <span>${display}</span>
        </div>
        <div style="
          width:0;height:0;border-left:8px solid transparent;
          border-right:8px solid transparent;border-top:10px solid #C9A24B;
          margin:-1px auto 0;width:16px;
        "></div>`,
        iconAnchor: [60, 42],
        popupAnchor: [0, -44],
      });

      L.marker([lat, lng], { icon: mainIcon })
        .addTo(map)
        .bindPopup(`<strong style="font-size:13px">${title}</strong><br/><span style="color:#C9A24B;font-weight:bold">${display}</span>`, { maxWidth: 220 })
        .openPopup();

      // ── Nearby PropKnown price pins ───────────────────────────────────────
      nearbyListings.forEach(p => {
        const pinIcon = L.divIcon({
          className: "",
          html: `<div style="
            background:#1a1a1a;color:#C9A24B;padding:4px 8px;border-radius:6px;
            font-weight:700;font-size:11px;white-space:nowrap;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            border:1px solid #C9A24B;
          ">${p.display}</div>
          <div style="
            width:0;height:0;border-left:5px solid transparent;
            border-right:5px solid transparent;border-top:7px solid #1a1a1a;
            margin:-1px auto 0;width:10px;
          "></div>`,
          iconAnchor: [30, 31],
          popupAnchor: [0, -33],
        });

        L.marker([p.lat, p.lng], { icon: pinIcon })
          .addTo(map)
          .bindPopup(
            `<div style="font-size:12px">
              <strong>${p.title}</strong><br/>
              <span style="color:#C9A24B;font-weight:bold">${p.display}</span><br/>
              <a href="/buy/${p.id}" style="color:#3b82f6;text-decoration:underline">View Details →</a>
            </div>`,
            { maxWidth: 200 }
          );
      });

      // ── Amenity markers ───────────────────────────────────────────────────
      amenities.forEach(a => {
        const amIcon = L.divIcon({
          className: "",
          html: `<div style="
            background:#fff;border:1px solid #e5e7eb;border-radius:50%;
            width:32px;height:32px;display:flex;align-items:center;
            justify-content:center;font-size:16px;
            box-shadow:0 1px 4px rgba(0,0,0,0.15);
          ">${CATEGORY_EMOJI[a.category] ?? "📍"}</div>`,
          iconSize:   [32, 32],
          iconAnchor: [16, 16],
          popupAnchor:[0, -18],
        });

        L.marker([a.lat, a.lng], { icon: amIcon })
          .addTo(map)
          .bindPopup(
            `<div style="font-size:12px">
              <strong>${a.name}</strong><br/>
              <span style="color:#6b7280">${Math.round(a.distance)} m away</span>
            </div>`,
            { maxWidth: 160 }
          );
      });
    })();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  // Update amenities + nearby pins when they change without re-creating the map
  useEffect(() => {
    // Map recreation handles initial load; updates to amenities/nearby are handled
    // by the parent re-mounting the map when coords change (key prop)
  }, [amenities, nearbyListings]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden"
      style={{ height: "420px", zIndex: 0 }}
    />
  );
}
