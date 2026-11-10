import Link from "next/link";
import PKLogo from "@/components/layout/PKLogo";
import { PK, REGISTRATIONS, PHONE, WHATSAPP } from "./tokens";

const COLS: { title: string; links: [string, string][] }[] = [
  { title: "Prices & tools", links: [["Area prices", "/ai-intelligence"], ["Price Check", "/price-check"], ["Project check", "/price-check#project"], ["True Cost", "/true-cost"], ["Legal Shield", "/legal-shield"]] },
  { title: "Property", links: [["Buy", "/buy"], ["Sell / list free", "/sell"], ["Services", "/services"], ["For Builders", "/builders"], ["NRI desk", "/nri"]] },
  { title: "Learn", links: [["Market News", "/news"], ["Guides", "/guides"], ["Podcast", "/podcast"], ["About", "/about"], ["Contact", "/contact"]] },
  { title: "Legal", links: [["Privacy", "/privacy"], ["Terms", "/terms"], ["Disclaimer", "/disclaimer"], ["Staff login", "/admin"]] },
];

export default function SiteFooter() {
  const regs = REGISTRATIONS.filter((r) => r.number);
  return (
    <footer style={{ background: PK.navyDeep }} className="text-white/70 pb-24 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid gap-10 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div>
          <PKLogo dark />
          <p className="mt-4 text-sm max-w-xs">Fair prices with sources and dates, RERA and document checks, and honest advice before you buy.</p>
          <p className="mt-4 text-sm"><a href={PHONE} className="hover:text-white">+91 70130 16003</a> · <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="hover:text-white">WhatsApp</a></p>
          <p className="text-sm">Hyderabad, Telangana</p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="text-[11px] uppercase tracking-[0.25em] mb-3" style={{ color: PK.gold }}>{c.title}</p>
            <ul className="space-y-2 text-sm">{c.links.map(([l, h]) => <li key={h + l}><Link href={h} className="hover:text-white">{l}</Link></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 text-xs flex flex-col sm:flex-row gap-2 justify-between">
          <p>© {new Date().getFullYear()} PropKnown Infra Pvt Ltd{regs.map((r) => ` · ${r.label} ${r.number}`).join("")}</p>
          <p>AI estimates are indicative only — verify with RERA and a lawyer before deciding.</p>
        </div>
      </div>
    </footer>
  );
}
