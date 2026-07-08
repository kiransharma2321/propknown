"use client";

import { X, Star, Shield, CheckCircle, ExternalLink, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useComparison } from "./ComparisonContext";
import { formatPrice } from "@/lib/utils";

// #8a6a2e (5.02:1 on white) instead of #C9A24B (2.40:1) -- WCAG AA needs 4.5:1 for text.
const GOLD = "#8a6a2e";

function quickTrueCost(price: number, status?: string): number {
  const isUC = status?.toLowerCase().includes("construction");
  const gst = isUC ? 0.05 : 0;
  const charges = 0.08 + gst; // 7.5% stamp+reg + 0.5% reg + GST
  return Math.round(price * (1 + charges) + 25000 + 50000);
}

function highlightMin(vals: (number | undefined)[], idx: number) {
  const nums = vals.filter((v): v is number => v !== undefined);
  if (nums.length < 2) return false;
  return vals[idx] === Math.min(...nums);
}

function highlightMax(vals: (number | undefined)[], idx: number) {
  const nums = vals.filter((v): v is number => v !== undefined);
  if (nums.length < 2) return false;
  return vals[idx] === Math.max(...nums);
}

const ROW_CLS = "border-b border-gray-100 last:border-0";
const LABEL_CLS = "py-3 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[120px]";
const CELL_CLS = "py-3 px-3 text-sm text-gray-900 text-center";

export default function ComparisonModal({ onClose }: { onClose: () => void }) {
  const { items, remove, clear } = useComparison();

  const trueCosts = items.map(it => quickTrueCost(it.price, it.status));
  const prices = items.map(it => it.price);
  const ppsf = items.map(it => it.sqft && it.sqft > 0 ? Math.round(it.price / it.sqft) : undefined);
  const scores = items.map(it => it.aiScore);

  const waText = encodeURIComponent(
    `Hi PropKnown, I'm comparing these properties:\n${items.map((it, i) => `${i + 1}. ${it.title} (${it.priceDisplay})`).join("\n")}\n\nPlease advise which offers better value.`
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:rounded-2xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden" style={{ maxWidth: "900px" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Property Comparison</h2>
            <p className="text-xs text-gray-500 mt-0.5">{items.length} properties · estimated all-in costs shown</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={clear} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scroll area */}
        <div className="overflow-auto flex-1">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="py-3 pr-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[120px]" />
                {items.map((it) => (
                  <th key={it.id} className="py-3 px-3 text-center align-top" style={{ width: `${(100 - 15) / items.length}%` }}>
                    <div className="relative">
                      <button
                        onClick={() => remove(it.id)}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-200 hover:bg-red-100 text-gray-500 hover:text-red-500 flex items-center justify-center transition-colors text-[10px]"
                      >
                        <X size={10} />
                      </button>
                      {it.image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={it.image} alt={it.title} className="w-full aspect-[4/3] object-cover rounded-xl mb-2" />
                      ) : (
                        <div className="w-full aspect-[4/3] bg-gray-100 rounded-xl mb-2 flex items-center justify-center text-gray-300 text-2xl">🏠</div>
                      )}
                      <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight">{it.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{it.location}, {it.city}</p>
                      {it.source === "curated" && (
                        <Link href={`/buy/${it.id}`} target="_blank" className="inline-flex items-center gap-1 text-[10px] mt-1 hover:underline" style={{ color: GOLD }}>
                          View <ExternalLink size={9} />
                        </Link>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Price */}
              <tr className={ROW_CLS}>
                <td className={LABEL_CLS}>Price</td>
                {items.map((it, i) => (
                  <td key={it.id} className={`${CELL_CLS} font-bold`}
                    style={{ color: highlightMin(prices, i) ? "#16a34a" : GOLD }}>
                    {it.priceDisplay}
                    {highlightMin(prices, i) && prices.filter(Boolean).length > 1 && (
                      <span className="ml-1 text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">Lowest</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Price / sqft */}
              <tr className={ROW_CLS}>
                <td className={LABEL_CLS}>₹ per sqft</td>
                {items.map((it, i) => (
                  <td key={it.id} className={CELL_CLS}>
                    {ppsf[i] ? (
                      <span style={{ color: highlightMin(ppsf, i) ? "#16a34a" : undefined }}>
                        ₹{ppsf[i]!.toLocaleString()}
                        {highlightMin(ppsf, i) && ppsf.filter(Boolean).length > 1 && (
                          <span className="ml-1 text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">Best</span>
                        )}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                ))}
              </tr>

              {/* Location / Type / BHK / Size */}
              <tr className={ROW_CLS}>
                <td className={LABEL_CLS}>Type</td>
                {items.map(it => <td key={it.id} className={CELL_CLS}>{it.type}</td>)}
              </tr>

              <tr className={ROW_CLS}>
                <td className={LABEL_CLS}>BHK / Size</td>
                {items.map(it => (
                  <td key={it.id} className={CELL_CLS}>
                    <span>{it.beds ? `${it.beds} BHK` : ""}</span>
                    {it.sqft ? <span className="text-gray-400 text-xs ml-1">· {it.sqft.toLocaleString()} sqft</span> : ""}
                    {!it.beds && !it.sqft && <span className="text-gray-300">—</span>}
                  </td>
                ))}
              </tr>

              <tr className={ROW_CLS}>
                <td className={LABEL_CLS}>Status</td>
                {items.map(it => (
                  <td key={it.id} className={CELL_CLS}>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      ["Ready to Move","Ready","Available"].includes(it.status ?? "")
                        ? "bg-green-50 text-green-700"
                        : "bg-yellow-50 text-yellow-700"
                    }`}>{it.status ?? "—"}</span>
                  </td>
                ))}
              </tr>

              {/* RERA / Verification */}
              <tr className={ROW_CLS}>
                <td className={LABEL_CLS}>RERA / Badge</td>
                {items.map(it => (
                  <td key={it.id} className={CELL_CLS}>
                    {it.badge ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                        <CheckCircle size={10} /> {it.badge}
                      </span>
                    ) : it.reraNumber ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                        <Shield size={10} /> RERA
                      </span>
                    ) : (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Owner Listed</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* AI Score */}
              <tr className={ROW_CLS}>
                <td className={LABEL_CLS}>AI Score</td>
                {items.map((it, i) => (
                  <td key={it.id} className={CELL_CLS}>
                    {it.aiScore ? (
                      <span className="inline-flex items-center gap-1 font-bold text-sm"
                        style={{ color: highlightMax(scores, i) ? "#16a34a" : GOLD }}>
                        <Star size={12} fill="currentColor" /> {it.aiScore}
                        {highlightMax(scores, i) && scores.filter(Boolean).length > 1 && (
                          <span className="ml-1 text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">Best</span>
                        )}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                ))}
              </tr>

              {/* True Cost (estimated) */}
              <tr className={`${ROW_CLS} bg-amber-50`}>
                <td className={`${LABEL_CLS} text-amber-700`}>
                  <div>Est. True Cost</div>
                  <div className="text-[9px] font-normal text-amber-500 mt-0.5">incl. ~8% charges</div>
                </td>
                {items.map((it, i) => (
                  <td key={it.id} className={`${CELL_CLS} font-bold`} style={{ color: highlightMin(trueCosts, i) ? "#16a34a" : "#92400e" }}>
                    {formatPrice(trueCosts[i], it.currency ?? "INR")}
                    {highlightMin(trueCosts, i) && trueCosts.length > 1 && (
                      <div className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold mt-1 inline-block">Lowest all-in</div>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[10px] text-gray-400 max-w-xs leading-relaxed">
            Est. True Cost includes ~7.5% stamp duty + 0.5% registration + GST + ₹75K legal/maintenance. Use the full{" "}
            <Link href="/cost-calculator" className="underline" style={{ color: GOLD }} onClick={onClose}>Cost Calculator</Link> for exact figures.
          </p>
          <a
            href={`https://wa.me/919701771333?text=${waText}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-white text-xs font-bold px-5 py-2.5 rounded-xl shrink-0 transition-all hover:opacity-90"
            style={{ background: "#25D366" }}
          >
            <MessageCircle size={14} /> Ask PropKnown Which is Better
          </a>
        </div>
      </div>
    </div>
  );
}
