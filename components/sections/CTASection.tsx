import Link from "next/link";
import { Phone, Mail, ArrowRight } from "lucide-react";
import LeadForm from "@/components/ui/LeadForm";
import { COMPANY } from "@/lib/utils";

export default function CTASection() {
  return (
    <section className="py-20 bg-black border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left */}
          <div>
            <p className="text-gold-400 text-sm tracking-widest uppercase mb-3">Get Started</p>
            <h2 className="section-heading text-white mb-4" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
              Ready to Make Your <span className="gold-text">Best Investment?</span>
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-8">
              Talk to a PropKnown expert today. No commitment, no pressure —
              just honest, data-backed advice from people who know the market.
            </p>

            <div className="space-y-4 mb-8">
              <a href={`tel:${COMPANY.phoneTel}`} className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-full border border-gold-500/40 bg-gold-500/10 flex items-center justify-center group-hover:bg-gold-500 group-hover:border-gold-500 transition-all">
                  <Phone size={18} className="text-gold-400 group-hover:text-black transition-colors" />
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Call / WhatsApp</p>
                  <p className="text-white font-semibold">{COMPANY.phone}</p>
                </div>
              </a>
              <a href={`mailto:${COMPANY.email}`} className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-full border border-gold-500/40 bg-gold-500/10 flex items-center justify-center group-hover:bg-gold-500 group-hover:border-gold-500 transition-all">
                  <Mail size={18} className="text-gold-400 group-hover:text-black transition-colors" />
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Email</p>
                  <p className="text-white font-semibold">{COMPANY.email}</p>
                </div>
              </a>
            </div>

            <div className="flex gap-3">
              <Link
                href={`https://wa.me/${COMPANY.whatsapp}`}
                target="_blank"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-sm font-semibold text-sm text-white transition-all"
                style={{ backgroundColor: "#25D366" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp Now
              </Link>
              <Link href="/contact" className="btn-secondary-dark">
                Contact Form <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          {/* Right — lead form */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
            <LeadForm
              source="homepage-cta"
              title="Quick Enquiry"
              subtitle="We reply within 2 hours during business hours."
            />
          </div>
        </div>
      </div>
    </section>
  );
}
