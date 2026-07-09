import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { OG_IMAGE } from "@/app/layout";

const BASE_URL = "https://www.propknown.com";

interface Props {
  params: { id: string };
}

// This route's page.tsx is a Client Component (fetches submission data client-side via
// useEffect), so it can't export generateMetadata itself -- that's a Server Component-only
// feature. A sibling layout.tsx CAN, so metadata is fetched here independently, in parallel
// to the existing client-rendering flow, without touching how the page itself works.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sub = await prisma.propertySubmission.findUnique({ where: { id: params.id } });
  if (!sub || sub.status !== "approved") {
    return { title: "Property Not Found" };
  }

  const description = sub.description?.slice(0, 155) ??
    `${sub.title} in ${sub.area}, ${sub.city}. ${sub.priceDisplay}. Verify with PropKnown before any decision.`;

  let ogImage = OG_IMAGE;
  try {
    const photoIds: string[] = JSON.parse(sub.photoIds || "[]");
    if (photoIds[0]) {
      ogImage = { ...OG_IMAGE, url: `${BASE_URL}/api/files/${photoIds[0]}` };
    }
  } catch {
    // Malformed photoIds JSON -- fall back to the default OG image rather than failing metadata.
  }

  const title = `${sub.title} — ${sub.priceDisplay}`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/buy/submission/${sub.id}` },
    openGraph: { images: [ogImage] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage.url] },
  };
}

export default async function SubmissionDetailLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  const sub = await prisma.propertySubmission.findUnique({ where: { id: params.id } });
  const breadcrumbJsonLd = sub && sub.status === "approved" ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Buy Properties", item: `${BASE_URL}/buy` },
      { "@type": "ListItem", position: 3, name: sub.title, item: `${BASE_URL}/buy/submission/${sub.id}` },
    ],
  } : null;

  return (
    <>
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      )}
      {children}
    </>
  );
}
