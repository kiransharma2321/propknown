import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, Shield, Clock, FileText, AlertTriangle, ArrowRight } from "lucide-react";
import { LEGAL_CHECKLIST_ITEMS } from "@/lib/legalShield";

export const metadata: Metadata = {
  title: "PropKnown Verified | Property Due Diligence & Trust Badges",
  description: "Learn what PropKnown Verified means — RERA, title checks, document review, layout approval, and encumbrance clearance. No fake ticks. Honest badges.",
};

const GOLD = "#C9A24B";

const CHECKS = [
  {
    icon: <Shield size={20} className="text-green-600" />,
    label: "RERA Registered",
    desc: "We confirm that the project or builder is registered under the Real Estate Regulation and Development Act (RERA) with the respective state authority. RERA number is displayed when verified.",
  },
  {
    icon: <CheckCircle size={20} className="text-green-600" />,
    label: "Title / Ownership Clear",
    desc: "Title deed and ownership chain are reviewed by our legal team to confirm no disputed ownership, forged documents, or contested succession issues.",
  },
  {
    icon: <FileText size={20} className="text-green-600" />,
    label: "Documents Checked",
    desc: "Key documents including sale deed, Encumbrance Certificate (EC), Khata, and building plan are sighted and cross-verified.",
  },
  {
    icon: <CheckCircle size={20} className="text-green-600" />,
    label: "Approved Layout",
    desc: "The layout is approved by the relevant authority — HMDA (Hyderabad), DTCP, BDA, or equivalent municipal body — confirming it is not unauthorised or in a prohibited zone.",
  },
  {
    icon: <CheckCircle size={20} className="text-green-600" />,
    label: "Encumbrance Clear",
    desc: "Encumbrance Certificate (EC) from the Sub-Registrar confirms there are no outstanding mortgages, loans, legal attachments, or claims against the property.",
  },
];

const HONEST = [
  {
    icon: <CheckCircle size={16} className="text-green-500" />,
    text: "Green ticks appear ONLY when a check is actually completed.",
  },
  {
    icon: <Clock size={16} className="text-blue-400" />,
    text: "\"Verification in progress\" is shown when checks are underway — never a fake tick.",
  },
  {
    icon: <AlertTriangle size={16} className="text-amber-500" />,
    text: "PropKnown verification reduces risk but is NOT a legal guarantee. Always engage your own advocate.",
  },
];

export default function VerifiedPage() {
  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          <span>/</span>
          <span className="text-gray-700">PropKnown Verified</span>
        </div>

        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(22,163,74,0.1)" }}>
              <Shield size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm tracking-widest uppercase font-semibold text-green-600">Due Diligence</p>
              <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
                <span style={{ color: GOLD }}>PropKnown Verified</span> — Trust You Can Check
              </h1>
            </div>
          </div>
          <p className="text-gray-500 text-lg max-w-xl">
            We independently check five critical aspects of a property before displaying any trust badge. No paid badges. No fake ticks. Checks shown only when completed.
          </p>
        </div>

        {/* Checks */}
        <div className="space-y-4 mb-12">
          {CHECKS.map(({ icon, label, desc }) => (
            <div key={label} className="flex items-start gap-4 border border-green-100 bg-green-50 rounded-2xl p-5">
              <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                {icon}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm mb-1">{label}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Legal Safety Checklist — deeper per-property layer */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={18} style={{ color: GOLD }} />
            <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
              The Legal <span style={{ color: GOLD }}>Safety Checklist</span>
            </h2>
          </div>
          <p className="text-gray-500 text-sm mb-5 max-w-xl">
            Beyond the summary PropKnown Verified badge, every listing has a detailed, 9-point
            Legal Safety Checklist — visible on each property page — so you can see exactly
            which specific checks have actually been completed, not just an overall score.
          </p>
          <div className="grid sm:grid-cols-3 gap-3 mb-5">
            {LEGAL_CHECKLIST_ITEMS.map((item) => (
              <div key={item.key} className="border border-gray-200 rounded-xl p-3.5 bg-gray-50">
                <p className="font-semibold text-gray-800 text-xs mb-1">{item.label}</p>
                <p className="text-gray-400 text-[11px] leading-relaxed">{item.why}</p>
              </div>
            ))}
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-5 justify-between">
            <div>
              <p className="text-white font-bold text-sm mb-1">Worried about a specific listing?</p>
              <p className="text-gray-400 text-xs">Run it through our free Fraud &amp; Red-Flag Checker before you commit.</p>
            </div>
            <Link
              href="/legal-shield"
              className="inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl transition-all hover:opacity-90 text-black whitespace-nowrap"
              style={{ background: GOLD }}
            >
              Check for Red Flags <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Honesty box */}
        <div className="border border-amber-200 bg-amber-50 rounded-2xl p-6 mb-12">
          <h2 className="font-bold text-gray-900 text-base mb-4 flex items-center gap-2">
            <Shield size={16} style={{ color: GOLD }} /> Our Commitment to Honesty
          </h2>
          <div className="space-y-3">
            {HONEST.map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{icon}</div>
                <p className="text-sm text-gray-700">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6" style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
            How Verification <span style={{ color: GOLD }}>Works</span>
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Request", body: "Seller or builder submits property documents via our platform." },
              { step: "2", title: "Review", body: "PropKnown's legal team reviews documents, cross-checks public records and RERA portal." },
              { step: "3", title: "Badge", body: "Each check that passes gets a green tick on the listing. Failed or incomplete checks show as pending — never faked." },
            ].map(({ step, title, body }) => (
              <div key={step} className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <div className="w-7 h-7 rounded-full text-xs font-bold text-white flex items-center justify-center mb-3" style={{ background: GOLD }}>
                  {step}
                </div>
                <p className="font-bold text-gray-900 text-sm mb-2">{title}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border border-gray-200 rounded-2xl p-6 bg-gray-50 mb-10">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong>Disclaimer:</strong> PropKnown&apos;s verification process is a due diligence service to assist property buyers. It is not a substitute for independent legal advice. Always consult a registered property advocate before completing any purchase. PropKnown is not liable for undisclosed encumbrances, title disputes, or regulatory changes occurring after the date of verification.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-gray-500 mb-4">Browse properties with PropKnown Verified badges</p>
          <Link
            href="/buy"
            className="inline-flex items-center gap-2 font-bold text-sm px-8 py-3.5 rounded-xl transition-all hover:opacity-90 text-black"
            style={{ background: GOLD }}
          >
            View Verified Properties
          </Link>
        </div>

      </div>
    </div>
  );
}
