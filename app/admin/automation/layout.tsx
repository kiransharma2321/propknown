import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PKLogo from "@/components/layout/PKLogo";
import { requireMasterPage } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/admin/automation", label: "Overview" },
  { href: "/admin/automation/ai-demand", label: "AI Demand" },
  { href: "/admin/automation/sequences", label: "Sequences" },
  { href: "/admin/automation/engine-health", label: "Engine Health" },
  { href: "/admin/automation/guidance-rates", label: "Guidance Rates" },
  { href: "/admin/automation/blog-studio", label: "Blog Studio" },
  { href: "/admin/automation/content-studio", label: "Content Studio" },
  { href: "/admin/approval-queue", label: "Approval Queue" },
  { href: "/admin/automation/project-finder", label: "Project Finder" },
  { href: "/admin/automation/calls", label: "Calls" },
  { href: "/admin/automation/testimonials", label: "Testimonials" },
];

export default async function AutomationLayout({ children }: { children: React.ReactNode }) {
  await requireMasterPage();
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/admin/dashboard" className="text-gray-400 hover:text-gray-900" aria-label="Back to dashboard"><ArrowLeft size={18} /></Link>
          <PKLogo />
        </div>
        <nav className="flex gap-1.5 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-[#D6A63E] hover:text-gray-900">
              {l.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}
