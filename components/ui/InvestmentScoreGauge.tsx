"use client";

import { useEffect, useState } from "react";

interface Props {
  /** 0-10 scale, matching AI Intelligence's investmentRating field */
  score: number;
  rentalYield?: number;
  growthRate?: number;
  className?: string;
}

// Pure SVG animated semicircular gauge — no chart library. Reuses the exact
// investmentRating/rentalYield/growthRate figures already computed by the same live AI
// Intelligence pricing engine used elsewhere on the site (via the "Area Price Insight" fetch
// on this page) — this is a visual presentation of that same data, not a second calculation.
export default function InvestmentScoreGauge({ score, rentalYield, growthRate, className = "" }: Props) {
  const clamped = Math.max(0, Math.min(10, score));
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimatedScore(clamped), 100);
    return () => clearTimeout(t);
  }, [clamped]);

  // Semicircle arc: 180deg, radius 70, centered at (90,90), drawn from left to right
  const R = 70;
  const CIRC = Math.PI * R; // half-circumference (the arc length of a semicircle)
  const pct = animatedScore / 10;
  const dashOffset = CIRC * (1 - pct);

  const color = clamped >= 7.5 ? "#16a34a" : clamped >= 5 ? "#C9A24B" : "#dc2626";
  const label = clamped >= 7.5 ? "Strong" : clamped >= 5 ? "Moderate" : "Weak";

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg viewBox="0 0 180 100" width="160" height="90">
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round"
        />
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1), stroke 0.6s ease" }}
        />
      </svg>
      <div className="-mt-9 text-center">
        <p className="text-2xl font-bold" style={{ color, fontFamily: "var(--font-playfair, Georgia, serif)" }}>
          {clamped.toFixed(1)}<span className="text-sm text-gray-400">/10</span>
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color }}>{label} Investment</p>
      </div>
      {(rentalYield != null || growthRate != null) && (
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          {rentalYield != null && <span>Yield: <strong className="text-gray-700">{rentalYield}%</strong></span>}
          {growthRate != null && <span>Growth: <strong className="text-gray-700">{growthRate}%/yr</strong></span>}
        </div>
      )}
    </div>
  );
}
