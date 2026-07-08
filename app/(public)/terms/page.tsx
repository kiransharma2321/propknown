import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms and conditions for using PropKnown real estate services.",
};

export default function TermsPage() {
  return (
    <div className="pt-32 pb-20 bg-brand-black min-h-screen">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>Terms of Use</h1>
        <p className="text-zinc-500 text-sm mb-10">Last updated: June 2026</p>
        <div className="space-y-6 text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-white text-lg font-semibold mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using PropKnown (propknown.com), you agree to be bound by these Terms of Use and all applicable laws. If you do not agree, please do not use this website.</p>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold mb-2">2. Use of Services</h2>
            <p>PropKnown provides property listings, AI-powered valuations, and real estate advisory services for informational purposes. All property data is believed to be accurate but is not guaranteed. Verify all details independently before any transaction.</p>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold mb-2">3. Intellectual Property</h2>
            <p>All content on this website — including text, images, AI valuations, and design — is the property of PropKnown Infra Pvt Ltd. Reproduction without prior written consent is prohibited.</p>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold mb-2">4. Limitation of Liability</h2>
            <p>PropKnown is not liable for any financial loss, property transaction outcome, or decisions made based on information on this website. All AI valuations are indicative only and not a substitute for professional legal or financial advice.</p>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold mb-2">5. Governing Law</h2>
            <p>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Hyderabad, Telangana.</p>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold mb-2">6. Contact</h2>
            <p>PropKnown Infra Pvt Ltd · <a href="mailto:kiranpropservices@gmail.com" className="underline" style={{ color: "#8a6a2e" }}>kiranpropservices@gmail.com</a> · <a href="tel:+919701771333" style={{ color: "#8a6a2e" }}>+91 97017 71333</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
