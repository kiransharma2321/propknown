import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Globe, FileText, CheckCircle, Phone, AlertCircle, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "NRI Property Investment India | PropKnown — UAE, US, UK, Singapore",
  description:
    "Complete guide for NRI property investment in India. FEMA rules, repatriation, power of attorney, remote buying, legal safeguards. Expert support from PropKnown.",
};

const GOLD = "#C9A24B";
const WA = "https://wa.me/919701771333";

const MARKETS = [
  { flag: "🇦🇪", label: "UAE (Dubai/Abu Dhabi)", count: "Largest NRI community" },
  { flag: "🇺🇸", label: "USA (New York, Bay Area, Houston)", count: "Tech & professional NRIs" },
  { flag: "🇬🇧", label: "UK (London, Midlands)", count: "Long-established diaspora" },
  { flag: "🇸🇬", label: "Singapore & APAC", count: "Fast-growing investor base" },
];

const FEMA_POINTS = [
  "NRIs and PIOs can buy residential and commercial properties in India without RBI approval.",
  "Agricultural land, farmhouses, and plantation properties require RBI approval for NRI purchase.",
  "Repatriation of sale proceeds is allowed up to 2 residential properties (with conditions).",
  "Funds must come through proper banking channels (NRE/NRO/FCNR accounts).",
  "TDS on NRI property purchase: buyer must deduct TDS (typically 20–30% on capital gains).",
  "Double Taxation Avoidance Agreements (DTAA) may apply to reduce tax burden.",
];

const PROCESS_STEPS = [
  {
    step: "01",
    title: "Brief & Budget",
    desc: "WhatsApp Raghu with your requirements — location, type, budget in your currency. He confirms realistic options and India pricing.",
  },
  {
    step: "02",
    title: "RERA + Legal Check",
    desc: "PropKnown shortlists RERA-registered, legally clear properties. Title deed, EC, and layout approvals verified by our legal team.",
  },
  {
    step: "03",
    title: "Virtual Site Tour",
    desc: "Video walkthrough by Raghu or our team. You see the actual property, surroundings, road access, and neighbouring development.",
  },
  {
    step: "04",
    title: "Power of Attorney (PoA)",
    desc: "You nominate a trusted person in India via an Indian consulate-attested PoA. This person signs documents on your behalf.",
  },
  {
    step: "05",
    title: "Banking & Payment",
    desc: "Payment through NRE/NRO/FCNR account. Our team coordinates with your bank on TDS deductions and payment milestones.",
  },
  {
    step: "06",
    title: "Registration & Mutation",
    desc: "Sale deed registered with Sub-Registrar. Property mutated in your name. All documents couriered to you.",
  },
];

const DOCUMENTS = [
  "Valid Indian Passport + Visa / OCI / PIO card",
  "NRE / NRO account details (payment must flow through Indian banking)",
  "PAN Card (mandatory for property purchase above ₹10L and tax filing)",
  "Overseas address proof (utility bill / bank statement)",
  "Power of Attorney (Indian consulate-attested, if signing remotely)",
  "Source of funds documentation (your overseas bank statement)",
];

const LEGAL_TIPS = [
  "Always buy from a RERA-registered builder or verify title with a registered advocate.",
  "Use an NRE account for repatriation; NRO proceeds have repatriation limits.",
  "Don't pay cash — all payments traceable via banking channel (prevents disputes).",
  "Get the Encumbrance Certificate (EC) for minimum 30 years — confirms no loans/liens.",
  "Avoid plots in 'revenue layouts' without HMDA/DTCP approval — legal issues common.",
  "File Indian Income Tax return if rental income exceeds ₹2.5L/year.",
];

export default function NRIPage() {
  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6">

        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold uppercase tracking-widest mb-6"
            style={{ borderColor: "rgba(201,162,75,0.4)", color: GOLD, background: "rgba(201,162,75,0.07)" }}>
            <Globe size={13} /> NRI Property Investment
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-5"
            style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
            Invest in India <span style={{ color: GOLD }}>from Anywhere</span>
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed mb-8">
            PropKnown is built for NRIs — RERA-verified properties, honest legal guidance, virtual site tours,
            and expert hand-holding from first enquiry to registration. Based in Hyderabad, serving
            the UAE, US, UK, and Singapore diaspora.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={`${WA}?text=${encodeURIComponent("Hi Raghu, I'm an NRI interested in investing in property in India. Can you help me?")}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
              style={{ background: "#25D366" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp Raghu — Free NRI Consultation
            </a>
            <Link href="/buy"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-sm border-2 transition-all"
              style={{ borderColor: `${GOLD}80`, color: GOLD }}>
              Browse Verified Properties <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Markets served */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
          {MARKETS.map(m => (
            <div key={m.label} className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center hover:border-yellow-400 transition-colors">
              <div className="text-3xl mb-2">{m.flag}</div>
              <p className="text-gray-900 font-semibold text-sm mb-1">{m.label}</p>
              <p className="text-gray-400 text-xs">{m.count}</p>
            </div>
          ))}
        </div>

        {/* FEMA Basics */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
            FEMA Basics — What NRIs <span style={{ color: GOLD }}>Can & Cannot Buy</span>
          </h2>
          <p className="text-gray-500 mb-6 text-sm">Under the Foreign Exchange Management Act (FEMA), NRI property rights are well-defined. Key points:</p>
          <div className="space-y-3">
            {FEMA_POINTS.map((pt, i) => (
              <div key={i} className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <CheckCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-gray-700 text-sm leading-relaxed">{pt}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-gray-600 text-xs leading-relaxed">
              <strong>Disclaimer:</strong> FEMA rules and tax rates change. This is general educational guidance only.
              Always consult a qualified CA / property advocate and your bank NRI desk before any purchase.
              PropKnown connects you with the right professionals.
            </p>
          </div>
        </div>

        {/* Remote Buying Process */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
            How PropKnown Handles <span style={{ color: GOLD }}>Remote Buying</span>
          </h2>
          <p className="text-gray-500 mb-8 text-sm">Our end-to-end process means you don&apos;t need to fly to India to buy property.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PROCESS_STEPS.map(s => (
              <div key={s.step} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-yellow-400 hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-black mb-4"
                  style={{ background: GOLD }}>
                  {s.step}
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-2">{s.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-5" style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
              <FileText size={18} className="inline mr-2" style={{ color: GOLD }} />
              Documents You&apos;ll Need
            </h2>
            <div className="space-y-2.5">
              {DOCUMENTS.map((d, i) => (
                <div key={i} className="flex items-start gap-2.5 bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-xs leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-5" style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
              <Shield size={18} className="inline mr-2" style={{ color: GOLD }} />
              NRI Legal Safeguards
            </h2>
            <div className="space-y-2.5">
              {LEGAL_TIPS.map((t, i) => (
                <div key={i} className="flex items-start gap-2.5 bg-green-50 border border-green-100 rounded-xl p-3">
                  <Shield size={14} className="text-green-600 shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-xs leading-relaxed">{t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Power of Attorney info */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 mb-16">
          <h2 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
            Power of Attorney (PoA) — <span style={{ color: GOLD }}>Your Remote Signing Tool</span>
          </h2>
          <div className="grid sm:grid-cols-3 gap-6 text-sm text-gray-600">
            <div>
              <p className="font-semibold text-gray-900 mb-2">What it is</p>
              <p className="text-xs leading-relaxed">A legal document authorising a trusted person in India (parent, sibling, friend, lawyer) to sign sale deeds, register property, and complete transactions on your behalf.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-2">How to get it</p>
              <p className="text-xs leading-relaxed">Visit your nearest Indian Consulate / High Commission with your passport. The PoA is attested there, then posted to India where it&apos;s notarised by a local notary before use.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-2">PropKnown&apos;s role</p>
              <p className="text-xs leading-relaxed">We draft the PoA language, guide you on what to include, coordinate with the advocate in India, and ensure the document is accepted by the Sub-Registrar&apos;s office.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-3xl p-10 text-center text-white" style={{ background: "linear-gradient(135deg,#1a1a1a,#2d2d2d)" }}>
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(201,162,75,0.2)", border: "2px solid rgba(201,162,75,0.4)" }}>
              <Phone size={24} style={{ color: GOLD }} />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
            Ready to Invest from <span style={{ color: GOLD }}>Abroad?</span>
          </h2>
          <p className="text-gray-300 max-w-lg mx-auto mb-6 text-sm leading-relaxed">
            Raghu personally handles all NRI clients. WhatsApp him — available 9am to 9pm IST (UTC+5:30).
            No obligation. No broker spam. Just honest advice and verified options.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={`${WA}?text=${encodeURIComponent("Hi Raghu, I'm an NRI and want to invest in property in India. Please help me understand the options.")}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-sm text-white"
              style={{ background: "#25D366" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp: +91 97017 71333
            </a>
            <Link href="/ai-intelligence"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-sm border border-white/20 text-white hover:bg-white/10 transition-all">
              AI Price Intelligence
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
