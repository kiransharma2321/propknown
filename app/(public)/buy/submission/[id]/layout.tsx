import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { OG_IMAGE } from "@/app/layout";
import { getAddressRegionCountry, truncateAtWord } from "@/lib/listings";

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

  const description = sub.description ? truncateAtWord(sub.description, 155) :
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

// Residence sub-type has a real, specific schema.org match for apartment/villa/house; anything
// else has no accurate dedicated type, so it falls back to the generic "Place" rather than
// forcing a wrong, more specific one. Mirrors buy/[id]/page.tsx's residenceType() exactly.
function residenceType(propType: string): string {
  const t = propType.toLowerCase();
  if (t === "apartment") return "Apartment";
  if (t === "villa" || t === "house") return "SingleFamilyResidence";
  return "Place";
}

// UN/CEFACT unit codes where a real one exists (sqft/sqyard/acre); "guntas" (an Indian land
// unit, ~101 sqm) has no standard code, so it uses unitText instead of fabricating one --
// schema.org's QuantitativeValue supports either.
const SIZE_UNIT_CODE: Record<string, string> = { sqft: "FTK", sqyard: "YDK", acre: "ACR" };

export default async function SubmissionDetailLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  const sub = await prisma.propertySubmission.findUnique({ where: { id: params.id } });

  // page.tsx is a Client Component that previously discovered "not found" only after
  // client-side hydration + fetch -- meaning the server always sent HTTP 200 first regardless,
  // a soft 404. This layout already does the same existence/approval check server-side for
  // metadata purposes, so it can settle the question before the client page ever renders,
  // sending a real 404 and skipping the now-pointless client fetch entirely.
  if (!sub || sub.status !== "approved") {
    notFound();
  }

  const url = `${BASE_URL}/buy/submission/${sub.id}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Buy Properties", item: `${BASE_URL}/buy` },
      { "@type": "ListItem", position: 3, name: sub.title, item: url },
    ],
  };

  // No offers/price block -- unlike static listings (a clean numeric price field), submissions
  // only ever store a free-text priceDisplay ("₹1.5 Cr" / "₹85 Lakhs" / "AED 2.2M" -- the
  // form's own placeholder shows all three formats are genuinely expected). Parsing that
  // reliably into a number risks silently fabricating a wrong structured price, which is worse
  // than omitting it -- same reasoning already applied to datePosted on the static listing
  // schema (omitted rather than guessed).
  let images: string[] = [];
  try {
    const photoIds: string[] = JSON.parse(sub.photoIds || "[]");
    images = photoIds.map(id => `${BASE_URL}/api/files/${id}`);
  } catch { /* malformed photoIds -- fall through with no images rather than fail the schema */ }

  const { region, country } = getAddressRegionCountry(sub.city);
  const listingJsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: sub.title,
    description: sub.description ?? `${sub.title} in ${sub.area}, ${sub.city}. ${sub.priceDisplay}.`,
    url,
    ...(images.length ? { image: images } : {}),
    about: {
      "@type": residenceType(sub.propType),
      name: sub.title,
      address: {
        "@type": "PostalAddress",
        streetAddress: sub.area,
        addressLocality: sub.city,
        ...(region ? { addressRegion: region } : {}),
        ...(country ? { addressCountry: country } : {}),
      },
      ...(sub.size && !isNaN(parseFloat(sub.size)) ? {
        floorSize: {
          "@type": "QuantitativeValue",
          value: parseFloat(sub.size),
          ...(sub.sizeUnit && SIZE_UNIT_CODE[sub.sizeUnit]
            ? { unitCode: SIZE_UNIT_CODE[sub.sizeUnit] }
            : { unitText: sub.sizeUnit ?? "sqft" }),
        },
      } : {}),
    },
    ...(sub.reraNumber ? {
      additionalProperty: { "@type": "PropertyValue", name: "RERA Registration Number", value: sub.reraNumber },
    } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listingJsonLd) }}
      />
      {children}
    </>
  );
}
