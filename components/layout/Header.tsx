"use client";

import { useState, useEffect } from "react";
import { Menu, X, Phone } from "lucide-react";
import Link from "next/link";
import { COMPANY } from "@/lib/utils";
import PKLogo from "./PKLogo";
import { CurrencyToggle } from "@/components/ui/CurrencyToggle";
import { LanguageToggle, useLanguage } from "@/components/ui/LanguageToggle";
import AccountLink from "@/components/buyer/AccountLink";
import type { DictKey } from "@/lib/i18n";

const navLinks: { key: DictKey; href: string }[] = [
  { key: "navHome",     href: "/" },
  { key: "navBuy",      href: "/buy" },
  { key: "navSell",     href: "/sell" },
  { key: "navServices", href: "/services" },
  { key: "navAiIntel",  href: "/ai-intelligence" },
  { key: "navInvest",   href: "/invest" },
  { key: "navBuilders", href: "/builders" },
  { key: "navNri",      href: "/nri" },
  { key: "navAbout",    href: "/about" },
  { key: "navContact",  href: "/contact" },
];

export default function Header() {
  const [open, setOpen]         = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

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
            <a href={`tel:${COMPANY.phone}`}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors"
              style={{ color: "#C9A24B" }}>
              <Phone size={12} />{COMPANY.phone}
            </a>
            <a href={`mailto:${COMPANY.email}`} className="text-gray-500 text-xs hover:text-gray-800 transition-colors">
              {COMPANY.email}
            </a>
            <AccountLink />
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <PKLogo />

        <ul className="hidden xl:flex items-center gap-6">
          {navLinks.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="nav-link text-[13px]">{t(l.key)}</Link>
            </li>
          ))}
        </ul>

        <div className="hidden lg:flex items-center gap-3">
          <LanguageToggle />
          <CurrencyToggle />
          <Link href="/contact" className="btn-gold text-sm py-2 px-4">
            {t("getConsultation")}
          </Link>
        </div>

        <button className="xl:hidden text-gray-600 hover:text-gray-900 transition-colors" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {open && (
        <div className="xl:hidden bg-white border-t border-gray-200 px-6 py-4">
          <ul className="flex flex-col gap-4">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="nav-link block py-1" onClick={() => setOpen(false)}>
                  {t(l.key)}
                </Link>
              </li>
            ))}
            <li className="pt-2 border-t border-gray-200">
              <AccountLink className="flex items-center gap-1.5 text-sm text-gray-600 py-1" />
            </li>
            <li>
              <Link href="/contact" className="btn-gold text-sm w-full justify-center" onClick={() => setOpen(false)}>
                {t("getConsultation")}
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
