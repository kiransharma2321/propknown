"use client";

import { track } from "@vercel/analytics";

type GTag = (...args: unknown[]) => void;
declare const gtag: GTag | undefined;

function gtagEvent(event: string, params?: Record<string, unknown>) {
  try {
    if (typeof gtag !== "undefined") gtag("event", event, params ?? {});
  } catch { /* noop */ }
}

export function trackEvent(event: string, params?: Record<string, string | number | boolean | null>) {
  try { track(event, params); } catch { /* noop */ }
  gtagEvent(event, params);
}

export const AnalyticsEvents = {
  leadSubmit:    (source: string) => trackEvent("lead_submit",    { source }),
  whatsappClick: (page: string)   => trackEvent("whatsapp_click", { page }),
  aiSearch:      (location: string) => trackEvent("ai_search",    { location }),
  propertyView:  (id: string, title: string) => trackEvent("property_view", { id, title }),
  compareOpen:   ()               => trackEvent("compare_open"),
  costCalc:      ()               => trackEvent("cost_calc_open"),
};
