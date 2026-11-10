"use client";

import { useState } from "react";
import Link from "next/link";
import type { KnownAIAnalysis } from "@/lib/knownai/analysis";

// Side-by-side area comparison + affordability for an Ask KnownAI 2.0 answer, then a
// "Talk to an expert" lead capture. Shows only what the engine returned (or the user said).

const day = (d?: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const LEVEL_COLOR: Record<string, string> = { High: "#4ade80", Medium: "#C9A24B", Low: "#f87171" };

export default function AnalysisCard({ a, question }: { a: KnownAIAnalysis; question: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, phone: phone.replace(/[^\d+]/g, ""), source: "KnownAI — expert request",
          message: `Asked KnownAI: "${question.slice(0, 300)}". Areas: ${a.areas.map((x) => x.name).join(", ")}.`,
        }),
      });
      setState(res.ok ? "done" : "error");
    } catch { setState("error"); }
  };

  return (
    <div className="mt-2 rounded-xl text-xs text-gray-200 overflow-hidden" style={{ background: "#222", border: "1px solid #3a3a3a" }}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-gray-400 text-[10px] uppercase tracking-wider">
              <th className="text-left px-2.5 py-2 font-medium">Area</th>
              <th className="text-right px-2.5 py-2 font-medium">Price</th>
              {a.budget ? <th className="text-right px-2.5 py-2 font-medium">Budget buys</th> : null}
            </tr>
          </thead>
          <tbody>
            {a.areas.map((x) => (
              <tr key={x.name} className="border-t" style={{ borderColor: "#333" }}>
                <td className="px-2.5 py-2 align-top">
                  <Link href={x.pagePath} className="underline">{x.name}</Link>
                  {x.available && x.confidence && (
                    <div className="text-[10px]" style={{ color: LEVEL_COLOR[x.confidence.level] ?? "#aaa" }}>{x.confidence.level} confidence · {day(x.fetchedAt)}</div>
                  )}
                </td>
                <td className="px-2.5 py-2 text-right align-top tabular-nums">
                  {x.available ? <>{x.symbol}{x.price!.toLocaleString("en-IN")}/{x.unit}{x.rangeMin && x.rangeMax ? <div className="text-[10px] text-gray-400">{x.rangeMin.toLocaleString("en-IN")}–{x.rangeMax.toLocaleString("en-IN")}</div> : null}</> : <span className="text-gray-400">Not enough data</span>}
                </td>
                {a.budget ? <td className="px-2.5 py-2 text-right align-top tabular-nums">{x.buyableSqft ? `~${x.buyableSqft.toLocaleString("en-IN")} sq.ft` : "—"}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {a.emi.length > 0 && (
        <div className="px-2.5 py-2 border-t" style={{ borderColor: "#333" }}>
          <p className="text-gray-400 mb-1">EMI on {inr(a.loanAmount!)} loan (80% of budget, 20 yrs){a.emi[0].labelled === "example rate" ? ", at example rates:" : ":"}</p>
          {a.emi.map((e) => (
            <p key={e.rate} className="tabular-nums">{e.rate}% → {inr(e.emi)}/month{e.pctOfIncome != null ? ` (${e.pctOfIncome}% of your income)` : ""}</p>
          ))}
          {a.emi[0].labelled === "example rate" && <p className="text-[10px] text-gray-500 mt-1">Use your bank&apos;s actual rate. Tell me your income for an affordability check.</p>}
        </div>
      )}

      {a.areas.some((x) => x.sources?.length) && (
        <div className="px-2.5 py-2 border-t text-[10px] text-gray-400" style={{ borderColor: "#333" }}>
          Sources: {Array.from(new Set(a.areas.flatMap((x) => x.sources ?? []))).slice(0, 6).join(", ")}
        </div>
      )}
      <p className="px-2.5 pb-2 text-[10px] text-gray-500">AI estimate — indicative only, verify with RERA/a lawyer before deciding.</p>

      <div className="px-2.5 py-2.5 border-t" style={{ borderColor: "#333", background: "#1d1d1d" }}>
        {state === "done" ? (
          <p className="text-green-400">Thanks — a PropKnown expert will call you shortly.</p>
        ) : (
          <form onSubmit={submit} className="space-y-1.5">
            <p className="font-semibold text-white">Talk to an expert (free)</p>
            <div className="flex gap-1.5">
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" className="flex-1 min-w-0 rounded-md px-2 py-1.5 text-white" style={{ background: "#2a2a2a", border: "1px solid #444" }} />
              <input required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" aria-label="Phone" className="flex-1 min-w-0 rounded-md px-2 py-1.5 text-white" style={{ background: "#2a2a2a", border: "1px solid #444" }} />
            </div>
            <button type="submit" disabled={state === "sending"} className="w-full rounded-md py-1.5 font-semibold text-black disabled:opacity-60" style={{ background: "#C9A24B" }}>
              {state === "sending" ? "Sending…" : "Request a call"}
            </button>
            {state === "error" && <p className="text-red-400">Couldn&apos;t send — WhatsApp us on 70130 16003.</p>}
          </form>
        )}
      </div>
    </div>
  );
}
