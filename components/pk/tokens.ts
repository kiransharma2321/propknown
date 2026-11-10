// PropKnown design system (Direction 1, "dark navy luxury"). One source for brand colours,
// navigation and the honest trust strip, used by the homepage and every page shell.

export const PK = {
  navy: "#0B1B33",
  navyDeep: "#07122A",
  navySoft: "#13284A",
  gold: "#D6A63E",
  goldText: "#7A5C1A", // gold that passes WCAG AA on white
  ivory: "#FBF8F2",
} as const;

export const WHATSAPP = "https://wa.me/917013016003?text=" + encodeURIComponent("Hi PropKnown, I'd like to talk to an advisor.");
export const PHONE = "tel:+917013016003";

export interface NavItem { label: string; href: string; children?: NavItem[] }

export const NAV: NavItem[] = [
  { label: "Prices", href: "/ai-intelligence" },
  { label: "Project check", href: "/price-check#project" },
  { label: "Buy", href: "/buy" },
  { label: "Sell", href: "/sell" },
  { label: "Legal Shield", href: "/legal-shield" },
  { label: "Blog", href: "/news", children: [{ label: "Market News", href: "/news" }, { label: "Guides", href: "/guides" }] },
  { label: "NRI", href: "/nri" },
  { label: "More", href: "/about", children: [{ label: "For Builders", href: "/builders" }, { label: "About", href: "/about" }, { label: "Contact", href: "/contact" }, { label: "True Cost", href: "/true-cost" }, { label: "Podcast", href: "/podcast" }] },
];

// Trust strip: only verifiable facts. Registrations stay hidden until their numbers are added
// here (null = not shown) -- no badge without a certificate number behind it.
export const REGISTRATIONS: { label: string; number: string | null }[] = [
  { label: "DPIIT-recognised startup", number: null },
  { label: "MSME (Udyam) registered", number: null },
];

export const TRUST_FACTS = [
  "Every price shows its sources and the date it was captured",
  "“Not enough data” instead of a guess",
  "Govt guidance values copied by hand from the official source",
  "Founded by Pinnelli Raghukiran — 20+ years across real estate, financial services and media",
];

export const HERO_PHOTO = {
  src: "https://images.unsplash.com/photo-1780900308450-dc9e1fb6f4df",
  alt: "Durgam Cheruvu cable bridge and the HITEC City skyline lit up at night, Hyderabad",
  credit: "Photo: Sai Kiran Anagani / Unsplash",
};
