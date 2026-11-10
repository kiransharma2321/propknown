"use client";

import { useEffect, useState } from "react";

// The admin-configured "we'll call you back" sentence, for client forms. Shows the safe default
// immediately, then the configured text (fetched once per page load).
const DEFAULT = "We'll call you back soon.";
let pending: Promise<string> | null = null;

export function useCallbackText(): string {
  const [text, setText] = useState(DEFAULT);
  useEffect(() => {
    pending ??= fetch("/api/site-settings").then((r) => r.json()).then((d) => d.callbackText || DEFAULT).catch(() => DEFAULT);
    let alive = true;
    pending.then((t) => { if (alive) setText(t); });
    return () => { alive = false; };
  }, []);
  return text;
}
