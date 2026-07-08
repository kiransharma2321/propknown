"use client";

import { useState } from "react";
import { Ruler, ChevronDown } from "lucide-react";

// Fixed conversion constants relative to sqft (standard definitions)
// 1 ankanam  =  36 sqft (common AP/Telangana usage)
// 1 cent     = 435.6 sqft = 48.4 sqyard (1/100 of an acre)
// 1 guntha   = 1,089 sqft = 121 sqyard
// 1 acre     = 43,560 sqft = 4,840 sqyard = 40 guntha
// 1 sq.yard  = 9 sqft
// 1 sq.metre = ~10.7639 sqft
const TO_SQFT: Record<string, number> = {
  sqft:     1,
  sqyard:   9,
  ankanam:  36,
  cent:     435.6,
  guntha:   1089,
  acres:    43560,
  sqmeter:  10.763910,
};

const UNIT_META: { key: string; label: string; short: string; local?: boolean }[] = [
  { key: "sqft",    label: "Sq. Feet",    short: "ft²"  },
  { key: "sqyard",  label: "Sq. Yards",   short: "sy"   },
  { key: "ankanam", label: "Ankanam",     short: "ank",  local: true },
  { key: "cent",    label: "Cent",        short: "ct",   local: true },
  { key: "guntha",  label: "Guntha",      short: "gun",  local: true },
  { key: "acres",   label: "Acres",       short: "ac"   },
  { key: "sqmeter", label: "Sq. Metres",  short: "m²"   },
];

function fmt(v: number): string {
  if (!isFinite(v) || v === 0) return "0";
  if (v >= 100_000) return v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  if (v >= 100)     return v.toLocaleString("en-IN", { maximumFractionDigits: 3 });
  if (v >= 1)       return v.toLocaleString("en-IN", { maximumFractionDigits: 4 });
  return v.toPrecision(4);
}

export default function UnitConverter() {
  const [rawValue, setRawValue] = useState("1");
  const [fromKey, setFromKey]   = useState("acres");

  const num    = parseFloat(rawValue) || 0;
  const inSqft = num * (TO_SQFT[fromKey] ?? 1);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <p className="text-gray-900 font-semibold text-sm mb-3 flex items-center gap-2">
        <Ruler size={14} style={{ color: "#8a6a2e" }} /> Unit Converter
      </p>

      {/* Input row */}
      <div className="flex gap-2 mb-3">
        <input
          type="number"
          min="0"
          value={rawValue}
          onChange={(e) => setRawValue(e.target.value)}
          placeholder="1"
          className="input-dark text-sm flex-1 min-w-0"
        />
        <div className="relative shrink-0">
          <select
            value={fromKey}
            onChange={(e) => setFromKey(e.target.value)}
            className="input-dark appearance-none pr-6 text-sm"
            style={{ minWidth: "7rem" }}
          >
            {UNIT_META.map((u) => (
              <option key={u.key} value={u.key}>{u.label}</option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Conversion results */}
      <div className="space-y-1.5">
        {UNIT_META.filter((u) => u.key !== fromKey).map((u) => {
          const converted = inSqft / (TO_SQFT[u.key] ?? 1);
          return (
            <div key={u.key}
              className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <span className={`text-xs ${u.local ? "text-amber-700 font-medium" : "text-gray-400"}`}>
                {u.label}{u.local ? " ★" : ""}
              </span>
              <span className="font-semibold text-gray-900 text-xs tabular-nums">
                {fmt(converted)}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-gray-400 text-[9px] mt-2.5 leading-relaxed">
        ★ Local AP/Telangana units. Ankanam/cent/guntha can vary slightly by region — figures use standard conversions (1 ankanam = 36 sqft, 1 cent = 435.6 sqft, 1 guntha = 1,089 sqft). Verify locally.
      </p>
      <p className="text-gray-300 text-[9px] mt-1 text-center tracking-wide uppercase">
        Fixed constants · Not AI-estimated
      </p>
    </div>
  );
}
