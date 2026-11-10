"use client";

import { MessageCircle, Phone, FileDown } from "lucide-react";
import { PK, PHONE, WHATSAPP } from "./tokens";

// Mobile-only sticky action bar: WhatsApp / Call / Get Report. Hidden from md up, where the
// nav CTA is always visible. Sits above the iOS home indicator.
export default function StickyActions({ reportHref = "/price-check#report" }: { reportHref?: string }) {
  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 gap-2 border-t border-white/10 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-xs font-semibold"
      style={{ background: `${PK.navy}F2`, backdropFilter: "blur(8px)" }}>
      <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 rounded-xl py-2 text-white" style={{ background: "#1f9d55" }}><MessageCircle size={18} /> WhatsApp</a>
      <a href={PHONE} className="flex flex-col items-center gap-1 rounded-xl py-2 text-white border border-white/20"><Phone size={18} /> Call</a>
      <a href={reportHref} className="flex flex-col items-center gap-1 rounded-xl py-2" style={{ background: PK.gold, color: PK.navy }}><FileDown size={18} /> Get Report</a>
    </div>
  );
}
