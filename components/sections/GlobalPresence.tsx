const MARKETS = [
  { city: "Hyderabad", country: "India", flag: "🇮🇳", tag: "HQ & Primary Market" },
  { city: "Bangalore", country: "India", flag: "🇮🇳", tag: "Tech Hub Properties" },
  { city: "Mumbai",    country: "India", flag: "🇮🇳", tag: "Financial Capital" },
  { city: "Delhi NCR", country: "India", flag: "🇮🇳", tag: "Government & Enterprise" },
  { city: "Dubai",     country: "UAE",   flag: "🇦🇪", tag: "NRI Investment Hub" },
  { city: "Singapore", country: "SG",    flag: "🇸🇬", tag: "APAC Premium" },
  { city: "London",    country: "UK",    flag: "🇬🇧", tag: "Global Diaspora" },
  { city: "New York",  country: "USA",   flag: "🇺🇸", tag: "US Market" },
];

export default function GlobalPresence() {
  return (
    <section className="py-20 bg-brand-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-gold-400 text-sm tracking-widest uppercase mb-2">Global Reach</p>
          <h2 className="section-heading-dark" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            Markets We <span className="gold-text">Serve</span>
          </h2>
          <p className="text-zinc-400 mt-3 max-w-xl mx-auto">
            From Hyderabad to New York — our network spans the world&apos;s most dynamic real estate markets.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {MARKETS.map((m) => (
            <div
              key={m.city}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center hover:border-gold-500 transition-all hover:-translate-y-0.5 group"
            >
              <div className="text-3xl mb-2">{m.flag}</div>
              <p className="text-white font-semibold text-sm group-hover:text-gold-400 transition-colors">
                {m.city}
              </p>
              <p className="text-zinc-500 text-[10px] mt-0.5">{m.country}</p>
              <span className="inline-block mt-2 bg-zinc-800 text-zinc-400 text-[9px] px-2 py-0.5 rounded-full">
                {m.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
