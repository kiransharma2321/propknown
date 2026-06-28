const stats = [
  { value: "2000+", label: "Enquiries Handled",     sub: "Buyers & sellers consulted" },
  { value: "₹500Cr+", label: "Transaction Value",   sub: "Facilitated across markets" },
  { value: "98%",  label: "Client Satisfaction",    sub: "Based on client feedback" },
  { value: "20+",  label: "Years of Expertise",     sub: "Founder experience" },
  { value: "5",    label: "Global Markets",          sub: "IN · US · UAE · UK · SG" },
];

export default function StatsSection() {
  return (
    <section className="bg-zinc-950 border-y border-zinc-800">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p
              className="text-3xl font-bold gold-text mb-1"
              style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}
            >
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
