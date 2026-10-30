import Link from "next/link";
import { BarChart3, Mail, PenSquare, ClipboardCheck, PhoneCall, Quote } from "lucide-react";

const SECTIONS = [
  { href: "/admin/automation/ai-demand", icon: BarChart3, title: "AI Demand", desc: "Every AI query logged — top searched localities, tools and results." },
  { href: "/admin/automation/sequences", icon: Mail, title: "Sequences", desc: "Which lead received which email (report, Day 2, Day 5, alerts) and when." },
  { href: "/admin/automation/content-studio", icon: PenSquare, title: "Content Studio", desc: "Daily social drafts from real price moves, and the weekly Market Pulse newsletter (sends only on your approval)." },
  { href: "/admin/approval-queue", icon: ClipboardCheck, title: "Approval Queue", desc: "Self-serve listings with AI price verdict and the 10-point checklist. Only approved listings go live." },
  { href: "/admin/automation/calls", icon: PhoneCall, title: "Calls", desc: "KnownAI Voice call log — inbound, outbound callbacks and browser calls, with summaries." },
  { href: "/admin/automation/testimonials", icon: Quote, title: "Testimonials", desc: "Add real client testimonials (client permission required) for the public site." },
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
