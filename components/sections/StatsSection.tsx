const stats = [
  { value: "RERA",  label: "Verified Platform",     sub: "Every listing cleared before listing" },
  { value: "AI",    label: "Market Intelligence",    sub: "Live valuations, any location" },
  { value: "Zero",  label: "Hidden Fees",            sub: "Transparent, success-based only" },
  { value: "20+",   label: "Years of Expertise",     sub: "Founder experience" },
  { value: "5",     label: "Global Markets",         sub: "IN · US · UAE · UK · SG" },
];

export default function StatsSection() {
  return (
    <section className="bg-zinc-950 border-y border-zinc-800">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-playfair text-3xl font-bold gold-accent mb-1">
              {s.value}
            </p>
            <p className="text-white text-sm font-semibold">{s.label}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
