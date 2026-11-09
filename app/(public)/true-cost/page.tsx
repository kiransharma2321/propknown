import type { Metadata } from "next";
import Link from "next/link";
import { Calculator, Info } from "lucide-react";
import { OG_IMAGE } from "@/app/layout";
import TrueCostCalculator from "@/components/tools/TrueCostCalculator";
import { RATE_TABLE } from "@/lib/trueCost";

const title = "True Cost Calculator — Stamp Duty, Registration & GST";
const description = "Work out the full cost of buying a home in Telangana, Andhra Pradesh, Karnataka or Maharashtra: stamp duty, registration, GST, builder charges and EMI, with the source of every government rate.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://www.propknown.com/true-cost" },
  openGraph: { title, description, images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
};

const GOLD = "#8a6a2e";
const ts = RATE_TABLE.Telangana, ka = RATE_TABLE.Karnataka, mh = RATE_TABLE.Maharashtra, ap = RATE_TABLE["Andhra Pradesh"];

const FAQ = [
  {
    q: "Why is the actual cost higher than the listed price?",
    a: "On top of the base price you pay stamp duty and registration to the state, GST if the home is under construction, and the builder's own charges (parking, clubhouse, maintenance deposit). Enter your numbers above to see the total.",
  },
  {
    q: "What are stamp duty and registration charges in Telangana?",
    a: `In urban Telangana, including Hyderabad: ${ts.stampDutyPct}% stamp duty + ${ts.transferDutyPct}% transfer duty + ${ts.registrationPct}% registration fee, about 6% in all, charged on the higher of the sale price and the government market value. Confirm on IGRS Telangana before paying.`,
  },
  {
    q: "What about Andhra Pradesh, Karnataka and Maharashtra?",
    a: `Andhra Pradesh: ${ap.stampDutyPct}% + ${ap.transferDutyPct}% transfer duty + ${ap.registrationPct}% registration. Karnataka: 2%, 3% or 5% stamp duty by value plus cess and surcharge, and ${ka.registrationPct}% registration. Maharashtra: ${mh.stampDutyPct}% stamp duty (+1% metro cess in Mumbai, Thane, Navi Mumbai, Pune and Nagpur) and 1% registration capped at ₹30,000.`,
  },
  {
    q: "When is GST applicable?",
    a: "Only on under-construction homes: 5%, or 1% for affordable housing (up to ₹45 lakh and within the carpet-area limit). Ready-to-move homes with an occupancy certificate and resales carry no GST.",
  },
  {
    q: "How accurate are these estimates?",
    a: "The government rates come from the sources listed under the calculator, with the date they were last checked. Concessions (for example for women buyers) and rural rates are not applied. Always confirm the final figure with the Sub-Registrar or the state's official calculator.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
};

export default function TrueCostPage() {
  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <Link href="/" className="hover:text-gray-700">Home</Link><span>/</span><span className="text-gray-700">True Cost Calculator</span>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(201,162,75,0.1)" }}>
              <Calculator size={24} style={{ color: GOLD }} />
            </div>
            <div>
              <p className="text-sm tracking-widest uppercase font-semibold" style={{ color: GOLD }}>Transparent Pricing</p>
              <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
                Know Your True Cost <span style={{ color: GOLD }}>of Buying</span>
              </h1>
            </div>
          </div>
          <p className="text-gray-500 text-lg max-w-2xl">Base price, stamp duty, registration, GST and builder charges, before you commit.</p>
        </div>

        <TrueCostCalculator />

        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6" style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
            Frequently Asked <span style={{ color: GOLD }}>Questions</span>
          </h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="border border-gray-200 rounded-xl p-5">
                <p className="font-semibold text-gray-900 text-sm mb-2">{q}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-5">
          <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Estimates for information only, not legal or tax advice. Rates change by government notification and vary by property type and buyer.
            Verify with a property lawyer and the Sub-Registrar&apos;s office before completing any purchase.
          </p>
        </div>

        <div className="mt-10 text-center flex flex-wrap justify-center gap-3">
          <Link href="/price-check" className="btn-primary">Check if the price is fair</Link>
          <Link href="/legal-shield" className="btn-secondary">Run a RERA &amp; fraud check</Link>
        </div>
      </div>
    </div>
  );
}
