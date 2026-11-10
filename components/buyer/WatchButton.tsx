"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BellRing } from "lucide-react";
import { FEATURES } from "@/lib/features";
import { useBuyer } from "./BuyerProvider";

// M2: "Watch this price" -- adds an area or project to the customer's watchlist; a daily job
// emails them when the sourced price moves 3% or more. Hidden while the feature flag is off.
export default function WatchButton({ kind, location, projectName, propertyType = "apartment", className = "" }: {
  kind: "area" | "project"; location: string; projectName?: string; propertyType?: string; className?: string;
}) {
  const { buyer } = useBuyer();
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  if (!FEATURES.accountV2) return null;

  const watch = async () => {
    if (!buyer) { router.push(`/account/login?next=${encodeURIComponent(pathname ?? "/account")}`); return; }
    setState("saving");
    const r = await fetch("/api/buyer/watches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, location, projectName, propertyType }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) setState("done"); else { setState("error"); setMsg(j.error ?? "Couldn't add to your watchlist."); }
  };

  return (
    <span className={`inline-flex flex-col ${className}`}>
      <button type="button" onClick={watch} disabled={state === "saving" || state === "done"}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#8a6a2e]/40 px-3 py-1.5 text-xs font-semibold text-[#7A5C1A] hover:bg-[#D6A63E]/10 disabled:opacity-80">
        {state === "done" ? <><BellRing size={13} /> Watching: we&apos;ll email you if the price moves 3%+</> : <><Bell size={13} /> {state === "saving" ? "Adding…" : "Watch this price"}</>}
      </button>
      {state === "error" && <span className="text-[11px] text-red-700 mt-1">{msg}</span>}
    </span>
  );
}
