import Link from "next/link";
import { PK } from "./tokens";

// Inner-page header in the Direction 1 style: navy band, breadcrumb, eyebrow, serif title.
export default function PageHero({ eyebrow, title, subtitle, crumbs }: {
  eyebrow: string; title: React.ReactNode; subtitle?: string; crumbs: { label: string; href?: string }[];
}) {
  return (
    <section className="relative isolate overflow-hidden pt-28 sm:pt-32 pb-14 text-white" style={{ background: `radial-gradient(1200px 400px at 85% 0%, ${PK.gold}22, transparent), ${PK.navy}` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-xs text-white/50 flex flex-wrap gap-1 mb-6">
          {crumbs.map((c, i) => (
            <span key={c.label} className="flex gap-1">
              {i > 0 && <span>/</span>}
              {c.href ? <Link href={c.href} className="hover:text-white">{c.label}</Link> : <span className="text-white/80">{c.label}</span>}
            </span>
          ))}
        </nav>
        <p className="text-[11px] tracking-[0.35em] uppercase" style={{ color: PK.gold }}>{eyebrow}</p>
        <h1 className="font-playfair text-4xl sm:text-6xl leading-tight mt-3 max-w-4xl">{title}</h1>
        {subtitle && <p className="text-white/70 mt-4 max-w-2xl text-lg">{subtitle}</p>}
      </div>
    </section>
  );
}
