import type { Metadata } from "next";
import { Building2, Users, BarChart3, Shield, CheckCircle } from "lucide-react";
import LeadForm from "@/components/ui/LeadForm";

export const metadata: Metadata = {
  title: "For Builders — Developer Partner Program",
  description: "Channel partner program for builders and developers. Access our active buyer network, AI-powered marketing, RERA compliance support, and transparent inventory management.",
};

export default function BuildersPage() {
  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "#8a6a2e" }}>Developer Partners</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            Sell Faster, <span className="gold-text">Sell Smarter</span>
          </h1>
          <p className="text-gray-500 mt-4 max-w-2xl mx-auto text-lg leading-relaxed">
            Channel partner excellence, AI-powered buyer targeting, and full RERA compliance support — PropKnown is your growth engine.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
          {[
            { icon: Users,     title: "Active Buyer Network",   desc: "Immediate access to pre-qualified, actively searching buyers." },
            { icon: BarChart3, title: "AI-Powered Marketing",  desc: "Data-driven buyer targeting. Right buyer for the right unit." },
            { icon: Shield,    title: "RERA Compliance",       desc: "Full RERA documentation support and compliance advisory." },
            { icon: Building2, title: "Inventory Management",  desc: "Real-time inventory tracking, floor plan management, pricing updates." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-gray-50 border border-gray-200 rounded-xl p-5 hover:border-yellow-400 hover:shadow-md transition-colors shadow-sm">
              <Icon size={24} className="mb-3" style={{ color: "#8a6a2e" }} />
              <h3 className="text-gray-900 font-semibold mb-2 text-base">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-gray-900 text-2xl font-bold mb-4" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
              Partner With <span className="gold-text">PropKnown</span>
            </h2>
            <ul className="space-y-3 mb-6">
              {[
                "Free channel partner onboarding",
                "Dedicated relationship manager",
                "Digital marketing and lead generation",
                "NRI buyer connections (UAE, USA, UK, SG)",
                "Bulk inventory advisory",
                "Transparent reporting dashboard",
              ].map((f) => (
                <li key={f} className="flex items-center gap-3 text-gray-700 text-sm">
                  <CheckCircle size={15} className="shrink-0" style={{ color: "#8a6a2e" }} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <LeadForm source="builders" title="Partner Enquiry" subtitle="We onboard new builder partners every week." />
          </div>
        </div>
      </div>
    </div>
  );
}
