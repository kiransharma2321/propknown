import Link from "next/link";
import { BarChart3, Mail, PenSquare, ClipboardCheck, Activity, Landmark, Mic2, Search } from "lucide-react";

const SECTIONS = [
  { href: "/admin/automation/ai-demand", icon: BarChart3, title: "AI Demand", desc: "Every AI query logged — top searched localities, tools and results." },
  { href: "/admin/automation/sequences", icon: Mail, title: "Sequences", desc: "Which lead received which email (report, Day 2, Day 5, alerts) and when." },
  { href: "/admin/automation/engine-health", icon: Activity, title: "Engine Health", desc: "Daily Gemini / Tavily / RapidAPI usage against quotas, with an 80% warning." },
  { href: "/admin/automation/guidance-rates", icon: Landmark, title: "Guidance Rates", desc: "Enter official government guidance values by hand, with source and effective date." },
  { href: "/admin/automation/blog-studio", icon: PenSquare, title: "Blog Studio", desc: "AI-drafted news and weekly Market Pulse posts. Publishes only on your approval." },
  { href: "/admin/automation/podcast-studio", icon: Mic2, title: "Podcast Studio", desc: "Upload episodes, AI transcript and notes, weekly episode ideas, RSS feed." },
  { href: "/admin/approval-queue", icon: ClipboardCheck, title: "Approval Queue", desc: "AI-drafted listings with the 10-point checklist and AI price check. Only approved listings go live." },
  { href: "/admin/automation/project-finder", icon: Search, title: "Project Finder", desc: "RERA sources and their terms status, plus every drafted project." },
];

export default function AutomationHome() {
  return (
    <div>
      <h1 className="heading-h3 mb-1">Growth & Automation</h1>
      <p className="text-gray-500 text-sm mb-6">Nothing here posts, publishes or sends marketing without your explicit click.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map(({ href, icon: Icon, title, desc }) => (
          <Link key={href} href={href} className="card-dark p-5 hover:border-[#D6A63E] transition-colors">
            <Icon size={18} style={{ color: "var(--gold-text)" }} />
            <p className="font-semibold mt-2">{title}</p>
            <p className="text-gray-500 text-xs mt-1 leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
