import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Users, BarChart3, Shield, CheckCircle, BadgeCheck, Scale, Inbox, Globe2, Target } from "lucide-react";
import LeadForm from "@/components/ui/LeadForm";
import ListProjectForm from "@/components/builders/ListProjectForm";

export const metadata: Metadata = {
  title: "For Builders — List Your Project on PropKnown",
  description: "List your project as a verified listing with an independent price check, and get enquiries with their source tracked, delivered to you and the CRM. Free pilot for early builder partners.",
};

// Builder pitch. Honest claims only: every feature named here exists on the site today, and no
// buyer counts, lead volumes or results are stated until there are real numbers to show.
const FEATURES = [
  { icon: BadgeCheck, title: "Verified listing", desc: "Your project goes live only after our 10-point check: RERA / HMDA / DTCP number verified on the official portal, real photos, correct areas, no misleading claims. Buyers see exactly what was checked.", link: { href: "/verified", label: "What we check" } },
  { icon: Scale, title: "Fair-Price badge", desc: "We compare your price per sq.ft with sourced asking prices for the area, each with its website and date. If it's within range, your listing shows a dated Fair-Price badge. We never invent a market figure.", link: { href: "/area-prices", label: "See area price guides" } },
  { icon: Target, title: "Project price check", desc: "Buyers who look up your project on PropKnown see its asking-price range from public sources, labelled builder price or resale. A fair price works in your favour.", link: { href: "/price-check", label: "Try the price check" } },
  { icon: Users, title: "Enquiries with the source tracked", desc: "Every enquiry records where the buyer came from (search, social, a campaign or a page) and what they looked at, so you can see which channel works." },
  { icon: Inbox, title: "Delivered to you and the CRM", desc: "Each enquiry arrives straight away by email with its full details. It also sits in a CRM timeline with notes, follow-ups and status, so nothing gets lost." },
  { icon: Globe2, title: "NRI buyers", desc: "A dedicated NRI section, and video-tour requests for buyers abroad who can't visit the site.", link: { href: "/nri", label: "NRI section" } },
];

const STEPS = [
  ["Send your project", "Use the form below: project, location and RERA / approval number."],
  ["We verify", "We check the number on the official portal, your price against sourced area prices, and your photos and details."],
  ["You approve", "You see the listing before it goes live. Nothing is published without your OK."],
  ["Live on PropKnown", "Your project appears on /buy with its verification and Fair-Price status."],
  ["Enquiries reach you", "Each enquiry comes to you with its source, by email and in the CRM, so you can follow up the same day."],
];

export default function BuildersPage() {
  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "var(--gold-text)" }}>Developer Partners</p>
          <h1 className="heading-h1 mb-4">
            Sell Faster, <span className="gold-text">Sell Smarter</span>
          </h1>
          <p className="text-gray-500 mt-4 max-w-2xl mx-auto text-lg leading-relaxed">
            Buyers trust what they can check. PropKnown lists your project with its approvals verified and its price checked against sourced market data. Then it sends you every enquiry with its source.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href="#list-project" className="btn-primary">List your project</a>
            <a href="#pilot" className="btn-secondary">Free pilot</a>
          </div>
        </div>

        {/* What you get */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {FEATURES.map(({ icon: Icon, title, desc, link }) => (
            <div key={title} className="card-dark bg-gray-50 p-5 flex flex-col">
              <Icon size={24} className="mb-3" style={{ color: "var(--gold-text)" }} />
              <h2 className="heading-h3 mb-2">{title}</h2>
              <p className="text-gray-500 text-sm leading-relaxed flex-1">{desc}</p>
              {link && <Link href={link.href} className="text-xs font-semibold underline mt-3" style={{ color: "var(--gold-text)" }}>{link.label} →</Link>}
            </div>
          ))}
        </div>

        {/* The original four offerings, kept, with claims we can stand behind */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {[
            { icon: Users,     title: "Active Buyer Network",  desc: "Buyers using PropKnown's area prices, project checks and listings find your project where they're already searching." },
            { icon: BarChart3, title: "AI-Powered Marketing", desc: "KnownAI answers buyers' questions from sourced data, and our area price guides bring buyers to your locality." },
            { icon: Shield,    title: "RERA Compliance",      desc: "We check RERA / approval numbers on the official portal before listing. A listing without one says \"Approval details pending\"." },
            { icon: Building2, title: "Inventory Management", desc: "Send us price or availability changes and we update your listing, with the date of each change." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card-dark bg-gray-50 p-5">
              <Icon size={24} className="mb-3" style={{ color: "var(--gold-text)" }} />
              <h3 className="heading-h3 mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <h2 className="heading-h2 mb-6 text-center">How it <span className="gold-text">works</span></h2>
        <ol className="grid gap-4 md:grid-cols-5 mb-16">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="border border-gray-200 rounded-xl p-4 bg-white">
              <span className="text-xs font-bold" style={{ color: "var(--gold-text)" }}>STEP {i + 1}</span>
              <p className="font-semibold text-gray-900 mt-1">{t}</p>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{d}</p>
            </li>
          ))}
        </ol>

        {/* Free pilot */}
        <div id="pilot" className="rounded-2xl p-6 md:p-8 mb-16 border scroll-mt-28" style={{ borderColor: "rgba(214,166,62,0.5)", background: "rgba(214,166,62,0.06)" }}>
          <h2 className="heading-h2 mb-2">Free pilot for <span className="gold-text">early builder partners</span></h2>
          <p className="text-gray-600 max-w-3xl">List one project at no cost while we launch. You get the verified listing, the Fair-Price check, and every enquiry with its source. There&apos;s no fee and no lock-in. We agree the pilot terms with you in writing before you start.</p>
          <p className="text-xs text-gray-500 mt-3">We share the pilot&apos;s enquiry numbers with you as they come in. We don&apos;t promise a set number of leads.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="heading-h2 mb-4">
              Partner With <span className="gold-text">PropKnown</span>
            </h2>
            <ul className="space-y-3 mb-6">
              {[
                "Free onboarding during the pilot",
                "One contact at PropKnown for your project",
                "Area price guides and project price checks that bring buyers to your locality",
                "NRI buyer section, with video-tour requests",
                "Pricing advice backed by sourced area data",
                "Enquiries with their source, by email and in the CRM",
              ].map((f) => (
                <li key={f} className="flex items-center gap-3 text-gray-700 text-sm">
                  <CheckCircle size={15} className="shrink-0" style={{ color: "var(--gold-text)" }} />
                  {f}
                </li>
              ))}
            </ul>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <LeadForm source="builders" title="Partner Enquiry" subtitle="Have questions first? Send them here and we'll call you." />
            </div>
          </div>
          <div id="list-project" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm scroll-mt-28">
            <ListProjectForm />
          </div>
        </div>
      </div>
    </div>
  );
}
