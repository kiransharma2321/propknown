import type { Metadata } from "next";
import CostCalculator from "@/components/ui/CostCalculator";
import Link from "next/link";
import { Calculator, Info } from "lucide-react";

export const metadata: Metadata = {
  title: "True Cost Calculator — India Property Purchase Cost",
  description: "Calculate the true all-in cost of buying property in India. Stamp duty, registration, GST, legal fees, brokerage, EMI — accurate state-wise estimates.",
  alternates: { canonical: "https://www.propknown.com/cost-calculator" },
};

// #8a6a2e (5.02:1 on white) instead of #C9A24B (2.40:1) -- WCAG AA needs 4.5:1 for text.
const GOLD = "#8a6a2e";

const FAQ = [
  {
    q: "Why is the actual cost higher than the listed price?",
    a: "In India, buying property attracts stamp duty (4–7.5% depending on state), registration fee (~0.5–1%), GST for under-construction properties (1% or 5%), plus legal and documentation charges. These can add 8–12% over the base price.",
  },
  {
    q: "What is stamp duty in Telangana?",
    a: "Telangana charges approximately 4% stamp duty + 1.5% transfer duty + 0.5% registration = around 6–7.5% total. Our calculator uses 7% stamp + 0.5% registration as a conservative estimate. Verify the exact rate for your property type with the Sub-Registrar.",
  },
  {
    q: "When is GST applicable?",
    a: "GST applies ONLY to under-construction properties (before OC/Completion Certificate): 1% for affordable housing (price ≤ ₹45L, carpet area ≤ 60 sqm) and 5% for others. Ready-to-move and resale properties are fully exempt from GST.",
  },
  {
    q: "Is brokerage included?",
    a: "PropKnown charges success-based brokerage only — no upfront fees. Our calculator defaults brokerage to 0%. You can edit it if working with other brokers.",
  },
  {
    q: "How accurate are these estimates?",
    a: "These are indicative estimates based on typical rates. The actual amount depends on the property's exact type, location, registered value, and the state's latest stamp duty notifications. Always confirm with the Sub-Registrar's office before completing any transaction.",
  },
];

export default function CostCalculatorPage() {
  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto px-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          <span>/</span>
          <span className="text-gray-700">True Cost Calculator</span>
        </div>

        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(201,162,75,0.1)" }}>
              <Calculator size={24} style={{ color: GOLD }} />
            </div>
            <div>
              <p className="text-sm tracking-widest uppercase font-semibold" style={{ color: GOLD }}>Transparent Pricing</p>
              <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
                Know Your True Cost <span style={{ color: GOLD }}>of Ownership</span>
              </h1>
            </div>
          </div>
          <p className="text-gray-500 text-lg max-w-2xl">
            See the real all-in cost of buying property in India — base price, government charges, taxes, and fees — before you commit.
          </p>
        </div>

        {/* Calculator */}
        <CostCalculator compact={false} />

        {/* Info boxes */}
        <div className="grid sm:grid-cols-3 gap-4 mt-10">
          {[
            { title: "Stamp Duty", body: "Charged by the state government on every property transaction. Rates vary: Telangana ~7%, Karnataka ~5.6%, Maharashtra ~6%." },
            { title: "GST Rules", body: "Ready/resale = 0% GST. Under-construction (price ≤ ₹45L) = 1%. Under-construction (above ₹45L) = 5% on agreement value." },
            { title: "PropKnown Fee", body: "We charge success-based fees only — never upfront. Default brokerage is 0% in this calculator. You control the number." },
          ].map(({ title, body }) => (
            <div key={title} className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-yellow-400 transition-colors">
              <p className="font-bold text-gray-900 text-sm mb-2">{title}</p>
              <p className="text-gray-500 text-xs leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6" style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
            Frequently Asked <span style={{ color: GOLD }}>Questions</span>
          </h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="border border-gray-200 rounded-xl p-5 hover:border-yellow-400 transition-colors">
                <p className="font-semibold text-gray-900 text-sm mb-2">{q}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-10 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-5">
          <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800 mb-1">Important Disclaimer</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              All calculations are estimates for informational purposes only. Stamp duty, registration fee, and GST rates can change without notice and vary by property type, buyer profile (woman buyer discounts apply in some states), and specific government notifications. Always verify with a registered property advocate and the concerned Sub-Registrar&apos;s office before completing any purchase.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <p className="text-gray-500 mb-4">Ready to find a property within your total budget?</p>
          <Link
            href="/buy"
            className="inline-flex items-center gap-2 font-bold text-sm px-8 py-3.5 rounded-xl transition-all hover:opacity-90 text-black"
            style={{ background: GOLD }}
          >
            Browse Verified Properties
          </Link>
        </div>

      </div>
    </div>
  );
}
