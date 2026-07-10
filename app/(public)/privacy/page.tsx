import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "PropKnown privacy policy: what data we collect (name, phone, email, enquiries), how we use it, our security measures, cookie use, and how to request access or deletion.",
  alternates: { canonical: "https://www.propknown.com/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="pt-32 pb-20 bg-brand-black min-h-screen">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>Privacy Policy</h1>
        <p className="text-zinc-500 text-sm mb-10">Last updated: June 2026</p>
        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-white text-lg font-semibold mb-2">1. Information We Collect</h2>
            <p>When you use PropKnown, we may collect: your name, phone number, email address, property enquiry details, and usage data (pages visited, search queries). This is used solely to serve your real estate requirements.</p>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold mb-2">2. How We Use Your Data</h2>
            <p>We use your information to: respond to property enquiries, send relevant listings, provide valuation reports, and improve our services. We do not sell your data to third parties. We do not send unsolicited spam.</p>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold mb-2">3. Data Security</h2>
            <p>Your data is stored securely on encrypted servers. We use industry-standard security measures. Access is restricted to PropKnown staff who need it to serve you.</p>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold mb-2">4. Cookies</h2>
            <p>We use minimal cookies for session management and analytics. No tracking or advertising cookies are used without your consent.</p>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold mb-2">5. Your Rights</h2>
            <p>You may request access to, correction of, or deletion of your personal data at any time by emailing <a href="mailto:kiranpropservices@gmail.com" className="underline" style={{ color: "#8a6a2e" }}>kiranpropservices@gmail.com</a>.</p>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold mb-2">6. Contact</h2>
            <p>PropKnown Infra Pvt Ltd · Shop No 3, Venkateswara Nilyam, Opp. Vertex Prime, Nizampet Road, Hyderabad 500090 · <a href="tel:+917013016003" style={{ color: "#8a6a2e" }}>+91 70130 16003</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
