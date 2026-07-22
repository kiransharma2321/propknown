// Internal tool, no public content to rank -- inherited the root layout's sitewide
// index:true/follow:true with no override, so /admin/* was indexable by Google.
export const metadata = { title: "PropKnown Admin", robots: { index: false, follow: false } };

// Nested layouts must NOT render their own <html>/<head>/<body> -- only the root layout
// (app/layout.tsx) may. This used to do exactly that, which produced two nested <html> roots
// and broke React hydration on every /admin page. The Playfair Display + Inter fonts it was
// trying to load are already loaded globally by the root layout (same family, same weights),
// so nothing is lost by dropping the duplicate <link> -- this div just carries the same dark
// theme the old <body> applied.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-white min-h-screen" style={{ background: "var(--navy)", fontFamily: "Inter, sans-serif" }}>
      {children}
    </div>
  );
}
