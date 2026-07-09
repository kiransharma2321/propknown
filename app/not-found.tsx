import Link from "next/link";

// Root-level boundary for genuinely unmatched URLs (typos, dead external links, etc.) that
// don't correspond to any route at all -- distinct from the /buy/[id] and
// /buy/submission/[id] not-found boundaries, which only catch a valid route shape with an
// invalid ID. Without this file, Next.js falls back to its generic unbranded "404: This page
// could not be found" page, found live during the SEO audit. Kept intentionally standalone
// (no Header/Footer import) since this file is reachable from every route in the app,
// including /admin and /crm which don't use the public site's nav.
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="bg-brand-black text-brand-white antialiased">
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.3)" }}>
              <span className="text-4xl">🔍</span>
            </div>
            <h1 className="text-2xl font-bold mb-3">Page Not Found</h1>
            <p className="text-gray-400 mb-8 leading-relaxed">
              The page you&apos;re looking for doesn&apos;t exist or may have moved.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-xl border-2 font-semibold text-sm transition-all hover:bg-white/5"
              style={{ borderColor: "rgba(201,162,75,0.5)", color: "#c9a24b" }}
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
