"use client";

import { FEATURES } from "@/lib/features";
import { CONSENT_TEXT } from "@/lib/whatsapp/rules";

// M12: opt-in WhatsApp consent on lead forms (unticked by default; flag NEXT_PUBLIC_FEATURE_WHATSAPP).
// The exact wording, time and source are logged server-side when it is ticked.
export default function WhatsAppConsent({ checked, onChange, dark = false }: { checked: boolean; onChange: (v: boolean) => void; dark?: boolean }) {
  if (!FEATURES.whatsapp) return null;
  return (
    <label className={`flex items-start gap-2 text-xs ${dark ? "text-gray-300" : "text-gray-600"}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span>{CONSENT_TEXT}</span>
    </label>
  );
}
