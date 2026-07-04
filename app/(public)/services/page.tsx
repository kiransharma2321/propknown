import type { Metadata } from "next";
import {
  Home, Building2, Globe, TrendingUp,
  Settings, Wrench, DollarSign, ShieldCheck,
  MapPin, Ruler, Scissors, Fence, Trees,
  Camera, BarChart2,
  Hammer, Palette,
  FileText, Scale, BadgeCheck,
} from "lucide-react";
import SmartLeadForm from "@/components/ui/SmartLeadForm";

export const metadata: Metadata = {
  title: "Services | PropKnown Infra Pvt Ltd",
  description: "Complete real estate services — Marketplace, Property Management, Land & Plot, Intelligence, Construction, and Legal. Enquire on WhatsApp.",
};

interface Service {
  icon: React.ElementType;
  name: string;
  desc: string;
  steps?: string[];
  sub?: { name: string; icon: React.ElementType }[];
  featured?: boolean;
}

interface Group {
  group: string;
  color: string;
  services: Service[];
}

const GROUPS: Group[] = [
  {
    group: "Property Marketplace",
    color: "#C9A24B",
    services: [
      { icon: Home,     name: "Buy Property",        desc: "RERA-verified listings across Hyderabad and 10+ cities. AI-scored for investment value, legal safety, and fair pricing." },
      { icon: TrendingUp,name: "Sell Property",      desc: "Maximum sale value in minimum time. Professional photography, digital marketing, and buyer matching from our verified buyer network." },
      { icon: Building2, name: "Rental Assistance",  desc: "Find verified tenants or properties for rent. Rental agreements, background checks, and property inspection included." },
      { icon: Settings,  name: "Resale Assistance",  desc: "Expert guidance on resale properties — title verification, price negotiation, and documentation handled end-to-end." },
      { icon: Globe,     name: "NRI Services",        desc: "Remote property management, NRI tax compliance, Power of Attorney, and investment advisory for Indian diaspora worldwide." },
      { icon: BarChart2, name: "Investment Advisory", desc: "Portfolio construction, ROI analysis, market timing, and off-plan investment guidance by seasoned experts." },
    ],
  },
  {
    group: "Property Management (PMS)",
    color: "#C9A24B",
    services: [
      { icon: ShieldCheck, name: "Property Management",   desc: "Complete end-to-end property management — tenant sourcing, rent collection, maintenance, and monthly reports." },
      { icon: Wrench,      name: "Facility Management",   desc: "Day-to-day facility oversight for residential and commercial properties. Vendor coordination, AMCs, and quality checks." },
      { icon: Settings,    name: "Maintenance Services",  desc: "Scheduled and emergency maintenance, civil work, electrical, plumbing, and painting — all handled on your behalf." },
      { icon: DollarSign,  name: "Accounting Services",   desc: "Transparent rent accounting, TDS compliance, GST filings, and monthly P&L statements for landlords." },
      { icon: BadgeCheck,  name: "Compliance Services",   desc: "Ensure your property meets all municipal, RERA, and legal compliance requirements with zero hassle." },
    ],
  },
  {
    group: "Land & Plot Services",
    color: "#C9A24B",
    services: [
      {
        icon: MapPin, name: "Property Identification",
        desc: "We locate your exact land parcel using government survey numbers, satellite mapping, and on-ground verification.",
        steps: ["Provide survey number / documents", "Our team locates the exact parcel", "Confirmed boundaries with GPS coordinates"],
      },
      {
        icon: Ruler, name: "Landmarking & Survey",
        desc: "Professional survey with boundary stones, corner markers, and certified documentation for dispute-free ownership.",
        steps: ["Provide land details and ownership documents", "Precise survey by licensed surveyor", "Clear boundary markings with legal documentation"],
      },
      {
        icon: Scissors, name: "Plot Cleaning Services",
        desc: "Clear overgrown vegetation, remove encroachments, enhance property value, and prevent legal complications from neglected land.",
      },
      {
        icon: Fence, name: "All Fencing Services",
        desc: "Secure your land boundary with professionally installed fencing. Choose your style:",
        sub: [
          { name: "Barbed Wire Fencing", icon: Fence },
          { name: "Stone Wall Fencing",  icon: Fence },
          { name: "Diamond Fencing",     icon: Fence },
        ],
      },
      {
        icon: Trees, name: "Plantation Services",
        desc: "Transform your land with professional plantation — adds value, creates income, and meets sustainability goals.",
        sub: [
          { name: "Lush Gardens",      icon: Trees },
          { name: "Thriving Orchards", icon: Trees },
          { name: "Serene Forests",    icon: Trees },
        ],
      },
    ],
  },
  {
    group: "Property Intelligence",
    color: "#C9A24B",
    services: [
      {
        icon: Camera, name: "Property Images & Videos",
        desc: "Annual subscription: quarterly date & time-stamped photos and videos of your property. Monitor condition, changes, and get visual records for legal proof.",
        featured: true,
      },
      { icon: BarChart2, name: "Market Valuation", desc: "AI-powered property valuation with comparable analysis, rental yield projections, and investment score. Used for informed buying, selling, and financing decisions." },
    ],
  },
  {
    group: "Construction & Design",
    color: "#C9A24B",
    services: [
      { icon: Hammer,  name: "Construction Services",  desc: "End-to-end construction management — house construction, additions, renovations. Licensed contractors, quality materials, transparent costing." },
      { icon: Palette, name: "Interior Design Services", desc: "Transform your space with professional interior design — residential, commercial, and modular kitchen. 3D visualization before execution." },
    ],
  },
  {
    group: "Legal & Documentation",
    color: "#C9A24B",
    services: [
      { icon: Scale,     name: "Legal Verification",           desc: "Title deed verification, encumbrance certificate, EC, litigations, and mutation records checked by experienced property advocates." },
      { icon: FileText,  name: "Documentation & Registration", desc: "Sale deed drafting, stamp duty calculation, SRO registration, and mutation — handled end-to-end by our legal team." },
      { icon: BadgeCheck,name: "RERA Compliance",              desc: "Builder and agent RERA registration, project approval, quarterly filing, and ongoing compliance management." },
    ],
  },
];

function ServiceCard({ s }: { s: Service }) {
  const waMsg = `https://wa.me/919701771333?text=${encodeURIComponent(`Hi, I'd like to enquire about the "${s.name}" service from PropKnown.`)}`;
  return (
    <div className={`bg-white border rounded-2xl p-6 flex flex-col hover:shadow-md transition-all ${s.featured ? "border-yellow-400 ring-1 ring-yellow-400/30" : "border-gray-200 hover:border-yellow-400"}`}>
      {s.featured && (
        <div className="mb-3">
          <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: "rgba(201,162,75,0.12)", color: "#C9A24B" }}>
            ★ FEATURED — Annual Subscription
          </span>
        </div>
      )}
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(201,162,75,0.1)" }}>
        <s.icon size={22} style={{ color: "#C9A24B" }} />
      </div>
      <h3 className="text-gray-900 font-bold text-base mb-2">{s.name}</h3>
      <p className="text-gray-500 text-sm leading-relaxed flex-1 mb-4">{s.desc}</p>
      {s.steps && (
        <ol className="mb-4 space-y-1.5">
          {s.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
              <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5" style={{ background: "rgba(201,162,75,0.15)", color: "#C9A24B" }}>{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      )}
      {s.sub && (
        <div className="mb-4 flex flex-wrap gap-2">
          {s.sub.map((item) => (
            <span key={item.name} className="text-xs bg-gray-100 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">{item.name}</span>
          ))}
        </div>
      )}
      <a
        href={waMsg}
        target="_blank" rel="noopener noreferrer"
        className="btn-outline-gold mt-auto inline-flex items-center justify-center gap-2 text-sm font-semibold py-2.5 px-4"
      >
        Enquire on WhatsApp
      </a>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center mb-16">
          <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "#C9A24B" }}>What We Do</p>
          <h1 className="section-heading" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            End-to-End <span className="gold-text">Real Estate Services</span>
          </h1>
          <p className="text-gray-500 mt-4 max-w-2xl mx-auto text-lg">
            From first enquiry to key handover and beyond — expert support at every step.
          </p>
        </div>

        {/* Services Enquiry Form */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 sm:p-8 mb-16 shadow-sm">
          <div className="max-w-3xl mx-auto">
            <SmartLeadForm
              formType="services"
              source="services-page"
              title="Enquire About a Service"
              subtitle="Select the service you need — our team responds within 2 hours."
            />
          </div>
        </div>

        {GROUPS.map(({ group, services }) => (
          <div key={group} className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-gray-200" />
              <h2 className="text-gray-900 font-bold text-xl whitespace-nowrap" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
                <span className="gold-text">{group}</span>
              </h2>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map((s) => (
                <ServiceCard key={s.name} s={s} />
              ))}
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
