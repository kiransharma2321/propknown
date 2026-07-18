import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import LeadForm from "@/components/ui/LeadForm";
import { COMPANY } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact Us | Hyderabad Real Estate Experts",
  description: "Contact PropKnown Infra Pvt Ltd — Nizampet Road, Hyderabad. Call or WhatsApp +91 70130 16003, or email kiranpropservices@gmail.com. Open Mon–Sat, 9am–7pm.",
};

export default function ContactPage() {
  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "var(--gold-text)" }}>Reach Us</p>
          <h1 className="heading-h1">
            Talk to a <span className="gold-text">PropKnown Expert</span>
          </h1>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            Our team of experts is ready to help you make smarter real estate decisions.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left - Info */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Phone,   label: "Phone / WhatsApp", value: COMPANY.phone,   href: `tel:${COMPANY.phoneTel}` },
                { icon: Mail,    label: "Email",             value: COMPANY.email,   href: `mailto:${COMPANY.email}` },
                { icon: Clock,   label: "Business Hours",    value: "Mon–Sat 9am–7pm IST", href: null },
                { icon: MapPin,  label: "Office",            value: COMPANY.address, href: null },
              ].map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="card-dark bg-gray-50 p-4">
                  <Icon size={20} className="mb-2" style={{ color: "var(--gold-text)" }} />
                  <p className="text-gray-500 text-xs mb-1">{label}</p>
                  {href ? (
                    <a href={href} className="text-gray-900 text-sm font-medium hover:text-[#7A5C1A] transition-colors duration-200">
                      {value}
                    </a>
                  ) : (
                    <p className="text-gray-900 text-sm font-medium">{value}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Google Maps embed */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <iframe
                title="PropKnown Office Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3805.7!2d78.3904!3d17.4849!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb93f9d6e4e1a1%3A0x1a2b3c4d5e6f7a8b!2sNizampet%20Road%2C%20Hyderabad%2C%20Telangana%20500090!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin"
                width="100%"
                height="280"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="px-4 py-3 flex items-center justify-between">
                <p className="text-gray-500 text-xs">Shop No 3, Venkateswara Nilayam, Opp. Vertex Prime, Nizampet Road</p>
                <a
                  href="https://maps.google.com/?q=Nizampet+Road+Hyderabad+500090"
                  target="_blank" rel="noopener noreferrer"
                  className="btn-tertiary text-xs whitespace-nowrap ml-4"
                >
                  Open Maps →
                </a>
              </div>
            </div>

            {/* Global offices */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm">
              <h2 className="heading-h3 mb-4">Global Presence</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { flag: "🇮🇳", label: "India", sub: "Hyderabad HQ" },
                  { flag: "🇦🇪", label: "UAE",   sub: "Dubai Office" },
                  { flag: "🇺🇸", label: "USA",   sub: "New York" },
                  { flag: "🇬🇧", label: "UK",    sub: "London" },
                  { flag: "🇸🇬", label: "Singapore", sub: "APAC" },
                ].map((m) => (
                  <div key={m.label} className="flex items-center gap-2 text-sm">
                    <span>{m.flag}</span>
                    <div>
                      <p className="text-gray-900 font-medium text-xs">{m.label}</p>
                      <p className="text-gray-500 text-[10px]">{m.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right - Form */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            <LeadForm source="contact" title="Send a Message" subtitle="We reply within 2 business hours." />
          </div>
        </div>
      </div>
    </div>
  );
}
