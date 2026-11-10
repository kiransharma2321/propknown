"use client";

import { useEffect } from "react";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_DAYS, cleanAttribution } from "@/lib/attribution";

// First-touch attribution: on a visitor's first page view, stores where they came from (UTM
// tags, the referring site, the landing page) in a first-party cookie for 90 days. Never
// overwritten by later visits, nothing else is captured, and it is only read when the visitor
// submits a lead form.
export default function AttributionCapture() {
  useEffect(() => {
    try {
      if (document.cookie.split("; ").some((c) => c.startsWith(`${ATTRIBUTION_COOKIE}=`))) return;
      const url = new URL(window.location.href);
      const p = url.searchParams;
      let referrer: string | undefined;
      try {
        const r = document.referrer ? new URL(document.referrer) : null;
        if (r && r.hostname !== url.hostname) referrer = `${r.protocol}//${r.hostname}${r.pathname}`;
      } catch { /* ignore malformed referrer */ }
      const data = cleanAttribution({
        utm_source: p.get("utm_source") ?? undefined, utm_medium: p.get("utm_medium") ?? undefined,
        utm_campaign: p.get("utm_campaign") ?? undefined, utm_content: p.get("utm_content") ?? undefined,
        referrer, landing_page: url.pathname,
      });
      if (!data) return;
      const secure = url.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify(data))}; Max-Age=${ATTRIBUTION_DAYS * 86400}; Path=/; SameSite=Lax${secure}`;
    } catch { /* storage blocked: attribution is optional */ }
  }, []);
  return null;
}
