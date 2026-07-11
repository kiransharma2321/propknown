import { Star, Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Suresh Reddy",
    location: "Hyderabad",
    role: "IT Professional",
    rating: 5,
    text: "PropKnown's AI valuation tool helped me understand if I was paying the right price. Ended up saving ₹12 lakhs on my Gachibowli apartment. Highly recommended!",
  },
  {
    name: "Priya Menon",
    location: "Dubai → Hyderabad",
    role: "NRI Investor",
    rating: 5,
    text: "As an NRI, I was worried about buying property remotely. PropKnown handled everything — RERA check, site visits, legal review. Smooth and professional throughout.",
  },
  {
    name: "Ramesh Sharma",
    location: "Bangalore",
    role: "Entrepreneur",
    rating: 5,
    text: "Sold my commercial property at 15% above market rate thanks to PropKnown's network. They had a buyer within 3 weeks. Exceptional service.",
  },
  {
    name: "Kavitha Iyer",
    location: "Mumbai",
    role: "Architect",
    rating: 5,
    text: "The KnownAI chatbot is amazing — answered all my queries at 11pm! The team followed up next morning and closed the deal within a month.",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-gold-400 text-sm tracking-widest uppercase mb-2">Client Stories</p>
          <h2 className="heading-h2-dark">
            What Our Clients <span className="gold-text">Say</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative hover:border-gold-500 transition-colors">
              <Quote size={32} className="text-gold-500/20 absolute top-4 right-4" />
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={14} className="text-gold-400 fill-gold-400" />
                ))}
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed mb-6 italic">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-gold-400 font-bold text-sm">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{t.name}</p>
                  <p className="text-zinc-500 text-xs">{t.role} · {t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
