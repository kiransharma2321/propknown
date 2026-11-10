"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";
import { CurrencyToggle } from "@/components/ui/CurrencyToggle";
import AccountLink from "@/components/buyer/AccountLink";
import { COMPANY } from "@/lib/utils";
import { PK } from "./tokens";

// The existing site navigation (components/layout/Header.tsx), restyled only: same items, same
// order, same links. New features live INSIDE existing items as dropdown entries -- a top-level
// label still links to the same page as before; its dropdown just adds the new entries.

interface Item { label: string; href: string; children?: { label: string; href: string }[] }

const NAV: Item[] = [
  { label: "Home", href: "/" },
  { label: "Buy", href: "/buy" },
  { label: "Sell", href: "/sell" },
  { label: "Services", href: "/services", children: [
    { label: "All services", href: "/services" },
    { label: "Legal Shield / Document Checker", href: "/legal-shield" },
    { label: "NRI Desk", href: "/nri" },
    { label: "Property Management", href: "/services#property-management-pms" },
  ] },
  { label: "AI Intel", href: "/ai-intelligence", children: [
    { label: "AI Intel", href: "/ai-intelligence" },
    { label: "Project check", href: "/price-check#project" },
  ] },
  { label: "For Builders", href: "/builders" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Resources", href: "", children: [
    // Existing entries first, unchanged
    { label: "Price Check", href: "/price-check" },
    { label: "Invest", href: "/invest" },
    { label: "NRI", href: "/nri" },
    { label: "Legal Shield", href: "/legal-shield" },
    { label: "True Cost", href: "/true-cost" },
    { label: "Guides", href: "/guides" },
    // Added
    { label: "Blog (Market News)", href: "/news" },
    { label: "Podcast", href: "/podcast" },
    { label: "Area Price Guides", href: "/area-prices" },
  ] },
];

const isActive = (pathname: string, href: string) =>
  !!href && (href === "/" ? pathname === "/" : pathname === href.split("#")[0] || pathname.startsWith(href.split("#")[0] + "/"));

export default function SiteNav({ overHero: overHeroProp }: { overHero?: boolean }) {
  const pathname = usePathname() ?? "/";
  const overHero = overHeroProp ?? pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);

  // Transparent only over the homepage hero photo; solid navy everywhere else.
  const solid = !overHero || scrolled || open;
  const linkCls = (active: boolean) => `inline-flex items-center gap-1 whitespace-nowrap px-2 py-2 text-[13px] border-b-2 transition-colors ${active ? "text-white border-[#D6A63E]" : "text-white/75 border-transparent hover:text-white"}`;

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${solid ? "shadow-lg" : ""}`}
      style={{ background: solid ? PK.navy : "linear-gradient(180deg, rgba(7,18,42,0.88), rgba(7,18,42,0.35))" }}>
      {/* Top bar: phone + email, as on the current site */}
      <div className="hidden lg:block border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-1.5 flex justify-end items-center gap-6 text-xs">
          <a href={`tel:${COMPANY.phoneTel}`} className="flex items-center gap-1.5 font-medium" style={{ color: PK.gold }}><Phone size={12} />{COMPANY.phone}</a>
          <a href={`mailto:${COMPANY.email}`} className="text-white/60 hover:text-white">{COMPANY.email}</a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 lg:h-[72px] flex items-center justify-between gap-4">
        <PKLogo dark />
        <nav aria-label="Main" className="hidden xl:flex items-center">
          {NAV.map((item) => {
            const active = item.children ? item.children.some((c) => isActive(pathname, c.href)) || isActive(pathname, item.href) : isActive(pathname, item.href);
            if (!item.children) return <Link key={item.label} href={item.href} className={linkCls(active)}>{item.label}</Link>;
            return (
              <div key={item.label} className="relative group">
                {item.href
                  ? <Link href={item.href} aria-haspopup="true" className={linkCls(active)}>{item.label} <ChevronDown size={13} className="transition-transform group-hover:rotate-180" /></Link>
                  : <button type="button" aria-haspopup="true" className={linkCls(active)}>{item.label} <ChevronDown size={13} className="transition-transform group-hover:rotate-180" /></button>}
                <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition absolute left-0 top-full pt-2">
                  <div className="min-w-56 rounded-2xl border border-white/10 p-2 shadow-2xl" style={{ background: PK.navy }}>
                    {item.children.map((c) => (
                      <Link key={c.label} href={c.href} className={`block rounded-xl px-3 py-2 text-sm ${isActive(pathname, c.href) ? "text-[#D6A63E]" : "text-white/85 hover:bg-white/10 hover:text-white"}`}>{c.label}</Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <CurrencyToggle />
          <AccountLink className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-white/30 text-white hover:bg-white/10 transition" />
          <Link href="/contact" className="rounded-lg px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:brightness-105" style={{ background: PK.gold, color: PK.navy }}>Request Consultation</Link>
        </div>
        <button className="xl:hidden p-2 text-white" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="xl:hidden h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/10 px-5 pb-28 pt-3 text-white" style={{ background: PK.navy }}>
          <ul className="flex flex-col">
            {NAV.map((item) => (
              <li key={item.label} className="border-b border-white/10 py-1">
                {item.href
                  ? <Link href={item.href} onClick={() => setOpen(false)} className={`block py-2.5 text-base ${isActive(pathname, item.href) ? "text-[#D6A63E]" : ""}`}>{item.label}</Link>
                  : <p className="pt-3 pb-1 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: PK.gold }}>{item.label}</p>}
                {item.children && (
                  <ul className="pl-3 pb-2">
                    {item.children.filter((c) => c.href !== item.href).map((c) => (
                      <li key={c.label}><Link href={c.href} onClick={() => setOpen(false)} className="block py-1.5 text-sm text-white/75">{c.label}</Link></li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-5 grid gap-3">
            <div className="lg:hidden"><CurrencyToggle /></div>
            <AccountLink className="flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-lg border border-white/30 text-white" />
            <Link href="/contact" onClick={() => setOpen(false)} className="rounded-lg py-3 text-center text-sm font-semibold" style={{ background: PK.gold, color: PK.navy }}>Request Consultation</Link>
            <a href={`tel:${COMPANY.phoneTel}`} className="text-center text-sm" style={{ color: PK.gold }}>{COMPANY.phone}</a>
            <a href={`mailto:${COMPANY.email}`} className="text-center text-xs text-white/60">{COMPANY.email}</a>
          </div>
        </div>
      )}
    </header>
  );
}
