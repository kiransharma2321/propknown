"use client";

import { useState } from "react";
import { GitCompare, X } from "lucide-react";
import { useComparison } from "./ComparisonContext";
import ComparisonModal from "./ComparisonModal";

const GOLD = "#C9A24B";

export default function ComparisonTray() {
  const { items, remove } = useComparison();
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <>
      {/* Floating tray */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border"
        style={{
          background: "#1a1a1a",
          borderColor: "rgba(201,162,75,0.4)",
          maxWidth: "calc(100vw - 32px)",
        }}
      >
        {/* Thumbnails */}
        <div className="flex items-center gap-2">
          {items.map(it => (
            <div key={it.id} className="relative group">
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700 shrink-0">
                {it.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={it.image} alt={it.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500 text-lg">🏠</div>
                )}
              </div>
              <button
                onClick={() => remove(it.id)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-700 hover:bg-red-600 text-white hidden group-hover:flex items-center justify-center transition-colors"
              >
                <X size={8} />
              </button>
            </div>
          ))}
        </div>

        <div className="h-8 w-px bg-zinc-700" />

        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 font-bold text-sm whitespace-nowrap transition-all hover:opacity-90 px-4 py-2 rounded-xl"
          style={{ background: GOLD, color: "#000" }}
        >
          <GitCompare size={15} />
          Compare ({items.length})
        </button>
      </div>

      {/* Modal */}
      {open && <ComparisonModal onClose={() => setOpen(false)} />}
    </>
  );
}
