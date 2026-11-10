"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { FEATURES } from "@/lib/features";
import { useBuyer } from "./BuyerProvider";

// M2: "Save this search" -- stores the current page + query string so it can be re-opened from
// My PropKnown. Hidden while the feature flag is off.
export default function SaveSearchButton({ kind, name, path, className = "" }: {
  kind: "listings" | "area" | "project"; name: string; path: string; className?: string;
}) {
  const { buyer } = useBuyer();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  if (!FEATURES.accountV2) return null;

  const save = async () => {
    if (!buyer) { router.push(`/account/login?next=${encodeURIComponent(path)}`); return; }
    setState("saving");
    const r = await fetch("/api/buyer/searches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, name, path }) }).catch(() => null);
    setState(r?.ok ? "done" : "error");
  };

  return (
    <button type="button" onClick={save} disabled={state === "saving" || state === "done"}
      className={`inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#D6A63E] disabled:opacity-80 ${className}`}>
      {state === "done" ? <><BookmarkCheck size={13} /> Saved to My PropKnown</> : <><Bookmark size={13} /> {state === "saving" ? "Saving…" : state === "error" ? "Couldn't save, try again" : "Save this search"}</>}
    </button>
  );
}
