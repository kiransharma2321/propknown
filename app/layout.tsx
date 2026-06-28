import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import JarvisChat from "@/components/chatbot/JarvisChat";

const BASE_URL = "https://www.propknown.com";

const OG_IMAGE = {
  url: `${BASE_URL}/logo.png`,
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
    "PropKnown — India's AI-powered, fully verified real estate platform. Buy, sell, and invest in RERA-registered properties across Hyderabad, Bangalore, Dubai & globally. AI valuations, HMDA plots, farm land, and NRI investment support.",
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
    images: [`${BASE_URL}/logo.png`],
  },

  icons: {
    icon:    [{ url: "/logo.png", type: "image/png" }],
    shortcut: "/logo.png",
    apple:   "/logo.png",
  },

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
  image: `${BASE_URL}/logo.png`,
  telephone: "+919701771333",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-brand-black text-brand-white antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Header />
        <main>{children}</main>
        <Footer />
        <WhatsAppButton />
        <JarvisChat />
      </body>
    </html>
  );
}
