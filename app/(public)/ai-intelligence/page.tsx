import AIIntelligenceClient from "@/components/ai-intel/AIIntelligenceClient";

// Forces this route to render per-request instead of being statically optimized. Required so
// AIIntelligenceClient's useSearchParams() (the ?area=&city= pre-fill from the homepage hero,
// added in an earlier session) can actually resolve against a real request during SSR.
//
// Without this, Next.js has no per-request context to statically generate against, so React
// bails out of server-rendering the ENTIRE client component tree -- confirmed directly by
// curling the page and finding a totally empty <main><template data-dgst=
// "BAILOUT_TO_CLIENT_SIDE_RENDERING"></template></main>, no page content at all in the initial
// HTML. That's a real regression for a page that used to be fully server-rendered (confirmed
// via an earlier SEO audit this session showing real visible text/H1 in its initial HTML) --
// found while verifying this session's other AI Intelligence work, not something this specific
// change introduced, but worth fixing now that it's been found.
//
// `export const dynamic` requires a Server Component file, which is why the actual "use client"
// implementation now lives in its own component (components/ai-intel/AIIntelligenceClient.tsx)
// instead of directly in this page.
export const dynamic = "force-dynamic";

export default function AIIntelligencePage() {
  return <AIIntelligenceClient />;
}
