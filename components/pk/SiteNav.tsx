"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X, User } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";
import { NAV, PK, WHATSAPP } from "./tokens";

// Site navigation: transparent over the hero, solid navy once scrolled. Desktop dropdowns open
// on hover AND focus (keyboard), mobile gets a full-screen menu.
export default function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${scrolled || open ? "shadow-lg" : ""}`}
      style={{ background: scrolled || open ? PK.navy : "linear-gradient(180deg, rgba(7,18,42,0.85), transparent)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 lg:h-20 flex items-center justify-between gap-4">
        <PKLogo dark />
        <nav aria-label="Main" className="hidden xl:flex items-center gap-1 text-sm text-white/80">
          {NAV.map((item) => item.children ? (
            <div key={item.label} className="relative group">
              <button className="flex items-center gap-1 px-3 py-2 rounded-full hover:text-white focus:text-white" aria-haspopup="true">
                {item.label} <ChevronDown size={14} className="transition-transform group-hover:rotate-180" />
              </button>
              <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition absolute left-0 top-full pt-2">
                <div className="min-w-48 rounded-2xl border border-white/10 p-2 shadow-2xl" style={{ background: PK.navy }}>
                  {item.children.map((c) => <Link key={c.href} href={c.href} className="block rounded-xl px-3 py-2 hover:bg-white/10">{c.label}</Link>)}
                </div>
              </div>
            </div>
          ) : (
            <Link key={item.href} href={item.href} className="px-3 py-2 rounded-full hover:text-white">{item.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/account" className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/25 px-4 py-2 text-xs text-white hover:bg-white/10"><User size={13} /> My account</Link>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="hidden md:inline-flex rounded-full px-4 py-2 text-xs font-semibold transition hover:-translate-y-0.5" style={{ background: PK.gold, color: PK.navy }}>Talk to an advisor</a>
          <button className="xl:hidden p-2 text-white" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="xl:hidden h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/10 px-4 pb-24 pt-4 text-white" style={{ background: PK.navy }}>
          {NAV.map((item) => (
            <div key={item.label} className="border-b border-white/10 py-1">
              {item.children ? (
                <>
                  <p className="px-2 pt-3 pb-1 text-[11px] uppercase tracking-[0.25em]" style={{ color: PK.gold }}>{item.label}</p>
                  {item.children.map((c) => <Link key={c.href} href={c.href} onClick={() => setOpen(false)} className="block px-2 py-2.5 text-lg">{c.label}</Link>)}
                </>
              ) : <Link href={item.href} onClick={() => setOpen(false)} className="block px-2 py-3 text-lg">{item.label}</Link>}
            </div>
          ))}
          <div className="grid gap-2 mt-6">
            <Link href="/account" onClick={() => setOpen(false)} className="rounded-full border border-white/25 px-4 py-3 text-center">My account</Link>
            <Link href="/admin" onClick={() => setOpen(false)} className="rounded-full border border-white/10 px-4 py-3 text-center text-white/60 text-sm">Staff login</Link>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="rounded-full px-4 py-3 text-center font-semibold" style={{ background: PK.gold, color: PK.navy }}>Talk to an advisor</a>
          </div>
        </div>
      )}
    </header>
  );
}
