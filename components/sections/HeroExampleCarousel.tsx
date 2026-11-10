"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { HeroExample } from "@/lib/heroExamples";

const ROTATE_MS = 4000;

function fmt(n: number, currency: string): string {
  return n.toLocaleString(currency === "INR" ? "en-IN" : "en-US");
}

// Rotating "Example Result" card. Every card is rendered into the SAME grid cell, so the box is
// always as tall as the tallest card -- rotating never shifts the layout around it. Only
// opacity/transform animate (GPU-cheap, no reflow).
export default function HeroExampleCarousel({ examples }: { examples: HeroExample[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = examples.length;

  useEffect(() => {
    if (paused || count < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, count]);

  if (count === 0) return null;
  return (
    <div
      className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--gold-text)" }}>
        Example Result
      </p>

      <div className="grid flex-1" aria-live={paused ? "polite" : "off"}>
        {examples.map((ex, i) => {
          const active = i === index;
          return (
            <div
              key={ex.id}
              aria-hidden={!active}
              className={`[grid-area:1/1] flex flex-col transition-all duration-500 ease-out motion-reduce:transition-none ${
                active ? "opacity-100 translate-x-0" : "opacity-0 translate-x-3 pointer-events-none"
              }`}
            >
              <p className="text-gray-900 font-bold text-sm">
                {ex.area}{ex.city && `, ${ex.city}`} · {ex.propertyType}
              </p>
              <p className="font-playfair text-2xl font-bold mt-1" style={{ color: "var(--gold-text)" }}>
                {ex.currencySymbol}{fmt(ex.price, ex.currency)}
                <span className="text-sm font-normal text-gray-500">/{ex.unit}</span>
              </p>
              {ex.rangeMin != null && ex.rangeMax != null && (
                <p className="text-gray-500 text-xs mt-1">
                  Realistic range: {ex.currencySymbol}{fmt(ex.rangeMin, ex.currency)} – {ex.currencySymbol}{fmt(ex.rangeMax, ex.currency)}/{ex.unit}
                </p>
              )}
              {ex.sources.length > 0 && (
                <div className="flex items-start gap-1.5 text-[11px] text-gray-500 mt-2">
                  <CheckCircle2 size={12} className="text-green-600 shrink-0 mt-px" />
                  <span>Sources: {ex.sources.join(", ")}</span>
                </div>
              )}
              <p className="text-gray-500 text-[11px] leading-relaxed mt-2 italic">
                &quot;{ex.label} — verify the specific property before deciding.&quot;
              </p>
              <p className="text-gray-500 text-[10px] mt-auto pt-2">
                Example · captured {new Date(ex.capturedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <div className="flex items-center justify-center gap-1 mt-3">
          {examples.map((ex, i) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show example ${i + 1}: ${ex.area}`}
              aria-current={i === index}
              className="p-[9px]"
            >
              <span
                className={`block h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? "w-4 bg-[#D6A63E]" : "w-1.5 bg-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
