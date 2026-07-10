"use client";

import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";
import { COMPANY } from "@/lib/utils";
import PKLogo from "./PKLogo";

const footerLinks = {
  Properties: [
    { label: "Buy Properties",  href: "/buy" },
    { label: "Sell Property",   href: "/sell" },
    { label: "Invest",          href: "/invest" },
    { label: "For Builders",    href: "/builders" },
  ],
  Services: [
    { label: "AI Intelligence",   href: "/ai-intelligence" },
    { label: "Property Services", href: "/services" },
    { label: "About Us",          href: "/about" },
    { label: "Pricing",           href: "/pricing" },
    { label: "Contact",           href: "/contact" },
  ],
  Resources: [
    { label: "True Cost Calculator", href: "/cost-calculator" },
    { label: "Price Reality Check",  href: "/price-check" },
    { label: "Legal Shield",         href: "/legal-shield" },
    { label: "Podcast",              href: "/podcast" },
    { label: "PropKnown Verified",   href: "/verified" },
  ],
};

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
    </svg>
  );
}
function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-black border-t border-zinc-800">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
        {/* Brand */}
        <div className="lg:col-span-2">
          {/* Logo */}
          <div className="mb-5">
            <PKLogo dark={true} />
          </div>
          <p className="font-semibold tracking-widest text-sm mb-4" style={{ color: "#C9A24B" }}>
            {COMPANY.tagline}
          </p>
          <p className="text-zinc-400 text-sm leading-relaxed mb-6 max-w-xs">
            Premium real estate advisory and transaction services across India and globally.
            Founded by {COMPANY.founder} with 20+ years of expertise.
          </p>
          <div className="flex items-center gap-3">
            {[
              { Icon: InstagramIcon, href: "https://instagram.com/propknown",        label: "Instagram" },
              { Icon: FacebookIcon,  href: "https://facebook.com/propknown",         label: "Facebook" },
              { Icon: YouTubeIcon,   href: "https://youtube.com/@propknown",         label: "YouTube" },
              { Icon: LinkedInIcon,  href: "https://linkedin.com/company/propknown", label: "LinkedIn" },
            ].map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-9 h-9 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-400 hover:border-zinc-400 hover:text-white transition-all"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>

        {/* Links */}
        {Object.entries(footerLinks).map(([heading, links]) => (
          <div key={heading}>
            <h4 className="text-white font-semibold text-sm mb-4 tracking-wider">{heading}</h4>
            <ul className="space-y-2.5">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-zinc-400 hover:text-gold-400 text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Contact bar */}
      <div className="border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href={`tel:${COMPANY.phoneTel}`} className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors text-sm">
            <Phone size={16} className="shrink-0" style={{ color: "#C9A24B" }} />
            {COMPANY.phone}
          </a>
          <a href={`mailto:${COMPANY.email}`} className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors text-sm">
            <Mail size={16} className="shrink-0" style={{ color: "#C9A24B" }} />
            {COMPANY.email}
          </a>
          <div className="flex items-start gap-3 text-zinc-400 text-sm">
            <MapPin size={16} className="shrink-0 mt-0.5" style={{ color: "#C9A24B" }} />
            <span>{COMPANY.address}</span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-600">
          <p>© 2026 {COMPANY.name}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy"     className="hover:text-zinc-400 transition-colors">Privacy Policy</Link>
            <Link href="/terms"       className="hover:text-zinc-400 transition-colors">Terms of Use</Link>
            <Link href="/disclaimer"  className="hover:text-zinc-400 transition-colors">Disclaimer</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
