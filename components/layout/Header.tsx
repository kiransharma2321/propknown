"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Phone, ChevronDown } from "lucide-react";
import Link from "next/link";
import { COMPANY } from "@/lib/utils";
import PKLogo from "./PKLogo";
import { CurrencyToggle } from "@/components/ui/CurrencyToggle";
import AccountLink from "@/components/buyer/AccountLink";

const navLinks = [
  { label: "Home",         href: "/" },
  { label: "Buy",          href: "/buy" },
  { label: "Sell",         href: "/sell" },
  { label: "Services",     href: "/services" },
  { label: "AI Intel",     href: "/ai-intelligence" },
  { label: "For Builders", href: "/builders" },
  { label: "About",        href: "/about" },
  { label: "Contact",      href: "/contact" },
];

const resourceLinks = [
  { label: "Price Check",  href: "/price-check" },
  { label: "Invest",       href: "/invest" },
  { label: "NRI",          href: "/nri" },
  { label: "Legal Shield", href: "/legal-shield" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Header() {
  const [open, setOpen]                   = useState(false);
  const [scrolled, setScrolled]           = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const resourcesRef = useRef<HTMLLIElement>(null);
  const closeTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (resourcesRef.current && !resourcesRef.current.contains(e.target as Node)) {
        setResourcesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Small delay on hover-leave so crossing the gap between the trigger and the
  // dropdown panel doesn't close it mid-transit.
  const openResources = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setResourcesOpen(true);
  };
  const scheduleCloseResources = () => {
    closeTimer.current = setTimeout(() => setResourcesOpen(false), 150);
  };
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const resourcesActive = resourceLinks.some(r => isActivePath(pathname, r.href));

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 transition-shadow duration-300 ${
      scrolled ? "shadow-md" : "shadow-sm"
    }`}>
      {/* Top bar */}
      <div className="bg-gray-50 border-b border-gray-200 hidden lg:block">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between">
          <span className="text-gray-500 text-xs">
            Premium Real Estate Across {COMPANY.markets.join(" · ")}
          </span>
          <div className="flex items-center gap-6">
            <a href={`tel:${COMPANY.phoneTel}`}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors"
              style={{ color: "#8a6a2e" }}>
              <Phone size={12} />{COMPANY.phone}
            </a>
            <a href={`mailto:${COMPANY.email}`} className="text-gray-500 text-xs hover:text-gray-800 transition-colors">
              {COMPANY.email}
            </a>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="max-w-7xl mx-auto px-4 lg:px-6 py-4 flex items-center justify-between gap-4 lg:gap-6">
        <PKLogo />

        <ul className="hidden xl:flex items-center gap-5 shrink-0">
          {navLinks.map((l) => {
            const active = isActivePath(pathname, l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`nav-link text-[13px] pb-1 border-b-2 ${active ? "nav-link-active border-[#C9A24B]" : "border-transparent"}`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}

          <li
            ref={resourcesRef}
            className="relative"
            onMouseEnter={openResources}
            onMouseLeave={scheduleCloseResources}
          >
            <button
              type="button"
              onClick={() => setResourcesOpen(o => !o)}
              aria-expanded={resourcesOpen}
              aria-haspopup="true"
              className={`nav-link text-[13px] pb-1 border-b-2 flex items-center gap-1 ${resourcesActive ? "nav-link-active border-[#C9A24B]" : "border-transparent"}`}
            >
              Resources
              <ChevronDown size={14} className={`transition-transform duration-200 ${resourcesOpen ? "rotate-180" : ""}`} />
            </button>

            {resourcesOpen && (
              <ul className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                {resourceLinks.map((r) => {
                  const active = isActivePath(pathname, r.href);
                  return (
                    <li key={r.href}>
                      <Link
                        href={r.href}
                        onClick={() => setResourcesOpen(false)}
                        className={`block px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                          active ? "text-[#8a6a2e] bg-gray-50" : "text-gray-700 hover:text-[#8a6a2e] hover:bg-gray-50"
                        }`}
                      >
                        {r.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        </ul>

        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <CurrencyToggle />
          <AccountLink className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-[#C9A24B]/60 text-[#8a6a2e] hover:border-[#C9A24B] hover:bg-[#C9A24B]/10 transition-colors duration-200" />
          <Link href="/contact" className="btn-gold text-sm py-2 px-4">
            Request Consultation
          </Link>
        </div>

        <button
          className="xl:hidden text-gray-600 hover:text-gray-900 transition-colors"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {open && (
        <div className="xl:hidden bg-white border-t border-gray-200 px-6 py-4">
          <ul className="flex flex-col gap-4">
            {navLinks.map((l) => {
              const active = isActivePath(pathname, l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`nav-link block py-1 ${active ? "nav-link-active" : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}

            <li className="pt-2 border-t border-gray-200">
              <span className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
                Resources
              </span>
              <ul className="flex flex-col gap-3 pl-1">
                {resourceLinks.map((r) => {
                  const active = isActivePath(pathname, r.href);
                  return (
                    <li key={r.href}>
                      <Link
                        href={r.href}
                        className={`nav-link block py-1 ${active ? "nav-link-active" : ""}`}
                        onClick={() => setOpen(false)}
                      >
                        {r.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>

            <li className="pt-2 border-t border-gray-200">
              <AccountLink className="flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-lg border border-[#C9A24B]/60 text-[#8a6a2e] hover:border-[#C9A24B] hover:bg-[#C9A24B]/10 transition-colors duration-200 w-full" />
            </li>
            <li>
              <Link href="/contact" className="btn-gold text-sm w-full justify-center" onClick={() => setOpen(false)}>
                Request Consultation
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
