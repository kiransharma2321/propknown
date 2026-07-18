import type { Metadata, Viewport } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";

// Self-hosted via next/font -- replaces the render-blocking third-party
// fonts.googleapis.com <link>/@import this site used to make on every single page. Variable
// names match exactly what globals.css/tailwind.config.ts already reference everywhere
// (var(--font-playfair), var(--font-inter)), so no other file needs to change.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

const BASE_URL = "https://www.propknown.com";

export const OG_IMAGE = {
  url: `${BASE_URL}/og-image.png`,
  width: 1200,
  height: 630,
  alt: "PropKnown Infra Pvt Ltd — AI-Verified Real Estate",
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "PropKnown | AI-Verified Real Estate in Hyderabad & Beyond",
    template: "%s | PropKnown",
  },
  description:
    "India's AI-powered, RERA-verified real estate platform. Buy, sell & invest across Hyderabad, Bangalore, Dubai & beyond. AI valuations, HMDA plots, NRI support.",
  keywords: [
    "real estate Hyderabad", "RERA verified properties", "property investment Hyderabad",
    "AI property valuation", "buy flat Hyderabad", "HMDA plots", "Kokapet", "Gachibowli",
    "NRI property investment India", "PropKnown", "property Hyderabad 2026",
    "Nallagandla apartments", "Financial District villas", "farm land Shankarpally",
  ],

  authors: [{ name: "PropKnown Infra Pvt Ltd", url: BASE_URL }],
  creator: "PropKnown Infra Pvt Ltd",
  publisher: "PropKnown Infra Pvt Ltd",

  openGraph: {
    type: "website",
    siteName: "PropKnown",
    url: BASE_URL,
    title: "PropKnown | AI-Verified Real Estate in Hyderabad & Beyond",
    description:
      "Buy, sell & invest in RERA-verified properties. AI market intelligence, Hyderabad's top listings, NRI support. Know. Invest. Grow.",
    images: [OG_IMAGE],
    locale: "en_IN",
  },

  twitter: {
    card: "summary_large_image",
    site: "@propknown",
    creator: "@propknown",
    title: "PropKnown | AI-Verified Real Estate",
    description:
      "RERA-verified properties, AI valuations & market intelligence across Hyderabad, Bangalore, Dubai. Know. Invest. Grow.",
    images: [`${BASE_URL}/og-image.png`],
  },

  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/logo.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// bg-brand-black below is actually white (#FFFFFF) -- see tailwind.config.ts, the token names
// are swapped from what they sound like. Matches the real page background so mobile browser
// chrome blends in instead of showing an unstyled default.
export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

// JSON-LD structured data for the business
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: "PropKnown Infra Pvt Ltd",
  alternateName: "PropKnown",
  description:
    "India's AI-powered, fully verified real estate platform. RERA-registered properties, AI market intelligence, HMDA plots, NRI investment support.",
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  image: `${BASE_URL}/og-image.png`,
  telephone: "+917013016003",
  email: "kiranpropservices@gmail.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Shop No 3, Venkateswara Nilayam, Opposite Vertex Prime, Nizampet Road",
    addressLocality: "Hyderabad",
    addressRegion: "Telangana",
    postalCode: "500090",
    addressCountry: "IN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 17.5095,
    longitude: 78.3768,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "20:00",
    },
  ],
  founder: {
    "@type": "Person",
    name: "Pinnelli Raghu Kiran",
    jobTitle: "Founder & CEO",
    alumniOf: ["ISB Hyderabad", "IIM", "BITS Pilani"],
  },
  areaServed: [
    { "@type": "City", name: "Hyderabad" },
    { "@type": "City", name: "Bangalore" },
    { "@type": "Country", name: "India" },
    { "@type": "Country", name: "United Arab Emirates" },
    { "@type": "Country", name: "United Kingdom" },
    { "@type": "Country", name: "Singapore" },
    { "@type": "Country", name: "United States" },
  ],
  sameAs: [
    "https://instagram.com/propknown",
    "https://facebook.com/propknown",
    "https://linkedin.com/company/propknown",
    "https://youtube.com/@propknown",
  ],
};

// A dedicated Organization schema alongside RealEstateAgent above -- RealEstateAgent (a
// LocalBusiness subtype) already carries the address/hours/geo data most SEO tooling asks
// LocalBusiness markup for, but some tooling and Google's own Knowledge Panel guidance
// specifically look for a plain Organization entry too. Kept intentionally minimal (no
// duplication of the address/hours/geo already declared above) rather than repeating the
// same facts under a second, redundant type.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PropKnown Infra Pvt Ltd",
  alternateName: "PropKnown",
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  sameAs: [
    "https://instagram.com/propknown",
    "https://facebook.com/propknown",
    "https://linkedin.com/company/propknown",
    "https://youtube.com/@propknown",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+917013016003",
    contactType: "customer service",
    email: "kiranpropservices@gmail.com",
    areaServed: ["IN", "AE", "GB", "SG", "US"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${montserrat.variable}`}>
      <body className="bg-brand-black text-brand-white antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <ClientProviders>
          {children}
        </ClientProviders>
        <Analytics />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            {/* next/script with afterInteractive -- was a plain <script> tag, which Next.js
                doesn't apply any loading strategy to, so it competed with the initial render
                instead of loading after the page became interactive. */}
            <Script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} strategy="afterInteractive" />
            <Script
              id="ga-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}');`,
              }}
            />
          </>
        )}
      </body>
    </html>
  );
}
