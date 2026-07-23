"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/settings", label: "Integrations" },
  { href: "/admin/settings/company", label: "Company Profile" },
  { href: "/admin/settings/lead-sources", label: "Lead Sources" },
  { href: "/admin/settings/builders", label: "Builders" },
  { href: "/admin/settings/banks", label: "Banks" },
  { href: "/admin/settings/property-types", label: "Property Types" },
  { href: "/admin/settings/email-templates", label: "Email Templates" },
];

export default function SettingsNav() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {LINKS.map(l => (
        <Link key={l.href} href={l.href}
          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
            pathname === l.href
              ? "border-[#D6A63E] text-gray-900 bg-[#D6A63E]/10 font-semibold"
              : "border-gray-200 text-gray-500 hover:text-gray-900 hover:border-[#D6A63E]"
          }`}>
          {l.label}
        </Link>
      ))}
    </div>
  );
}
