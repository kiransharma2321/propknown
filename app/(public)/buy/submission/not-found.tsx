import Link from "next/link";

// notFound() is called from app/(public)/buy/submission/[id]/layout.tsx. A layout can't use a
// not-found.tsx in its OWN segment (the layout is what renders that boundary as part of its
// children, so it can't also be the fallback for its own throw) -- it bubbles up to the nearest
// ANCESTOR segment's not-found.tsx instead. This is that ancestor boundary, one level up from
// [id]. Confirmed empirically: a not-found.tsx placed at [id]/ was never reached; Next.js fell
// through all the way to its generic unbranded default 404 until this file was added here.
export default function SubmissionNotFound() {
  return (
    <div className="pt-32 pb-20 bg-white min-h-screen flex items-center justify-center">
      <div className="max-w-md text-center px-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.3)" }}>
          <span className="text-4xl">🏠</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Property Not Found</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          This listing may not have been approved yet, may have been removed, or the link may be incorrect.
        </p>
        <Link
          href="/buy"
          className="inline-block px-6 py-3 rounded-xl border-2 font-semibold text-sm transition-all hover:bg-gray-50"
          style={{ borderColor: "rgba(201,162,75,0.5)", color: "#8a6a2e" }}
        >
          ← Back to All Listings
        </Link>
      </div>
    </div>
  );
}
