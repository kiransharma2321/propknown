import type { LegalChecklist } from "./legalShield";
import type { ConstructionMilestone } from "./constructionProgress";

export interface Listing {
  id: string;
  title: string;
  location: string;
  city: string;
  display: string;
  price: number;
  currency: string;
  sqft?: number;
  /** Carpet area, sqft -- distinct from `sqft` (built-up area). Left unset rather than
   *  estimated: RERA-disclosed carpet area is a specific verified figure, not something to
   *  guess from a loading-factor formula. */
  carpetSqft?: number;
  beds?: number;
  baths?: number;
  floor?: string;
  facing?: string;
  status: string;
  /** "sale" or "rent" -- inferred from existing pricing (e.g. a "/mo" display), not new data. */
  listingType?: string;
  badge?: string;
  badgeNo?: string;
  aiScore?: number;
  type: string;
  images: string[];
  description?: string;
  extra?: string;
  lat?: number;
  lng?: number;
  features?: string[];
  legalChecklist?: LegalChecklist;
  legalChecklistNotes?: string;
  constructionMilestones?: ConstructionMilestone[];
  constructionPctComplete?: number;
  constructionExpectedCompletion?: string;
}

// Pre-defined coordinates for known areas (avoids geocoding for all static listings)
const AREA_COORDS: Record<string, [number, number]> = {
  "Gachibowli":        [17.4449, 78.3498],
  "Kokapet":           [17.3900, 78.3200],
  "Nallagandla":       [17.4612, 78.3072],
  "HITEC City":        [17.4474, 78.3762],
  "Banjara Hills":     [17.4138, 78.4449],
  "Financial District":[17.4143, 78.3445],
  "Whitefield":        [12.9698, 77.7500],
  "Dubai Marina":      [25.0777, 55.1403],
  "Medchal":           [17.6281, 78.4842],
  "Shankarpally":      [17.4218, 78.1271],
  "Kollur":            [17.4742, 78.2485],
  "Nizampet":          [17.5095, 78.3768],
  "Kompally":          [17.5697, 78.4718],
  "Tellapur":          [17.4832, 78.2805],
  "Manikonda":         [17.4010, 78.3938],
  "Kondapur":          [17.4610, 78.3611],
};

export function getListingCoords(location: string, city: string): [number, number] | null {
  for (const [area, coords] of Object.entries(AREA_COORDS)) {
    if (location.toLowerCase().includes(area.toLowerCase()) ||
        area.toLowerCase().includes(location.toLowerCase())) {
      return coords;
    }
  }
  const cityFallbacks: Record<string, [number, number]> = {
    "Hyderabad":   [17.3850, 78.4867],
    "Bangalore":   [12.9716, 77.5946],
    "Dubai":       [25.2048, 55.2708],
    "Mumbai":      [19.0760, 72.8777],
    "Rangareddy":  [17.4218, 78.1271],
  };
  return cityFallbacks[city] ?? null;
}

// For structured-data addresses (JSON-LD PostalAddress). Found and fixed a real bug while
// auditing: the RealEstateListing schema previously hardcoded addressRegion:"Telangana" and
// addressCountry:"IN" for every listing regardless of city -- silently wrong for the site's
// own Dubai Marina listing (city: "Dubai") and Whitefield listing (city: "Bangalore", which is
// Karnataka, not Telangana). Returns undefined region/country for any city not in this map
// rather than guessing, since a wrong claimed location is worse than an absent one.
const CITY_REGION_COUNTRY: Record<string, { region?: string; country: string }> = {
  "Hyderabad":  { region: "Telangana",    country: "IN" },
  "Rangareddy": { region: "Telangana",    country: "IN" },
  "Bangalore":  { region: "Karnataka",    country: "IN" },
  "Mumbai":     { region: "Maharashtra",  country: "IN" },
  "Pune":       { region: "Maharashtra",  country: "IN" },
  "Chennai":    { region: "Tamil Nadu",   country: "IN" },
  "Delhi NCR":  { region: "Delhi",        country: "IN" },
  "Dubai":      { country: "AE" },
  "Singapore":  { country: "SG" },
  "London":     { country: "GB" },
  "Toronto":    { region: "Ontario",      country: "CA" },
};

export function getAddressRegionCountry(city: string): { region?: string; country?: string } {
  return CITY_REGION_COUNTRY[city] ?? {};
}

// Plain .slice(0, n) on a meta description cuts mid-word ("...excellent cross-ventil") --
// found while auditing the two dynamic listing pages that use this pattern. Backs up to the
// last space within the limit instead, so it always ends on a whole word.
export function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
}

function withCoords(l: Omit<Listing, "lat" | "lng">): Listing {
  const c = getListingCoords(l.location, l.city);
  return { ...l, lat: c?.[0], lng: c?.[1] };
}

export const ALL_LISTINGS: Listing[] = [
  // ──── Featured Properties (prop-1 … prop-6) ────────────────────────────────
  withCoords({
    id: "prop-1",
    title: "Luxury 3BHK Apartment — Gachibowli",
    location: "Gachibowli", city: "Hyderabad",
    display: "₹95 Lakhs", price: 9500000, currency: "INR",
    beds: 3, baths: 3, sqft: 1850, floor: "7th Floor", facing: "East",
    status: "Ready to Move", badge: "RERA", badgeNo: "P02400001234",
    aiScore: 8.7, type: "Apartment",
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80",
    ],
    description: "Spacious 3BHK apartment in the heart of Gachibowli IT hub. Premium finishes, modular kitchen, branded fittings. 24×7 security, power backup, covered parking. Walking distance to tech parks and malls.",
    features: ["Modular Kitchen", "Covered Parking", "24×7 Security", "Power Backup", "Gym", "Swimming Pool", "Children's Play Area"],
    legalChecklist: {
      rera: "verified", title: "verified", encumbrance: "verified", layout: "verified",
      permissions: "verified", taxReceipts: "verified", occupancy: "verified",
      saleDeedChain: "verified", litigation: "verified",
    },
  }),
  withCoords({
    id: "prop-2",
    title: "Premium Villa — Financial District",
    location: "Financial District", city: "Hyderabad",
    display: "₹2.8 Cr", price: 28000000, currency: "INR",
    beds: 5, baths: 5, sqft: 5200, floor: "G+2", facing: "North",
    status: "Ready to Move", badge: "RERA", badgeNo: "P02400005678",
    aiScore: 9.2, type: "Villa",
    images: [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
    ],
    description: "Stunning G+2 independent villa in the prestigious Financial District. Private garden, home theatre, rooftop terrace. Vastu compliant. Gated community with club house and concierge services.",
    features: ["Private Garden", "Home Theatre", "Rooftop Terrace", "Vastu Compliant", "Servant Quarters", "4-Car Parking", "Concierge Service"],
  }),
  withCoords({
    id: "prop-3",
    title: "Modern 2BHK — Whitefield, Bangalore",
    location: "Whitefield", city: "Bangalore",
    display: "₹82 Lakhs", price: 8200000, currency: "INR",
    beds: 2, baths: 2, sqft: 1200, floor: "3rd Floor", facing: "North",
    status: "Ready to Move", badge: "RERA", badgeNo: "PRM/KA/RERA/1251",
    aiScore: 8.1, type: "Apartment",
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
      "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=800&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80",
    ],
    description: "Compact and modern 2BHK in Whitefield's IT corridor. Excellent rental yield potential. Well-connected to Marathahalli, Sarjapura Road. Reputed school and hospital within 2 km.",
    features: ["Modular Kitchen", "Parking", "Lift", "Gym", "Security", "Power Backup"],
  }),
  withCoords({
    id: "prop-4",
    title: "Waterfront Apartment — Dubai Marina",
    location: "Dubai Marina", city: "Dubai",
    display: "AED 28L", price: 2800000, currency: "AED",
    beds: 2, baths: 2, sqft: 1400, floor: "18th Floor", facing: "Sea",
    status: "Ready to Move", badge: "DLD",  badgeNo: "DLD/2024/7823",
    aiScore: 8.9, type: "Apartment",
    images: [
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80",
      "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80",
    ],
    description: "Breathtaking sea-view apartment in Dubai Marina. Fully furnished, hotel-grade finishes. 8-10% rental yield. Ideal for NRI investors. 0% property tax, strong capital appreciation.",
    features: ["Sea View", "Fully Furnished", "Pool", "Gym", "Concierge", "1 Parking", "NRI-Friendly"],
  }),
  withCoords({
    id: "prop-5",
    title: "Office Space — HITEC City",
    location: "HITEC City", city: "Hyderabad",
    display: "₹1.2L/mo", price: 120000, currency: "INR",
    sqft: 2000, floor: "5th Floor", facing: "Main Road",
    status: "Available", listingType: "rent", badge: "RERA", badgeNo: "P02400009900",
    aiScore: 7.8, type: "Commercial",
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80",
      "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&q=80",
    ],
    description: "Grade-A commercial office space in HITEC City's prime business zone. Glass facade, centrally air-conditioned. Dedicated parking for 8 cars. Ideal for tech/consulting firms. Flexible lease terms.",
    features: ["Central AC", "8 Parking Slots", "Meeting Rooms", "Cafeteria", "High-Speed Internet", "Power Backup"],
  }),
  withCoords({
    id: "prop-6",
    title: "Penthouse — Banjara Hills",
    location: "Banjara Hills", city: "Hyderabad",
    display: "₹6.5 Cr", price: 65000000, currency: "INR",
    beds: 4, baths: 4, sqft: 6000, floor: "Top Floor", facing: "All Sides",
    status: "Ready to Move", badge: "RERA", badgeNo: "P02400099001",
    aiScore: 9.5, type: "Penthouse",
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80",
      "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80",
    ],
    description: "Ultra-luxury penthouse in Banjara Hills. 360° city views, private rooftop pool, smart home automation, chef's kitchen, personal lift. One-of-a-kind trophy asset in Hyderabad's most coveted zip code.",
    features: ["Private Rooftop Pool", "Smart Home", "Chef's Kitchen", "Private Lift", "360° City View", "6-Car Parking", "Wine Cellar"],
  }),

  // ──── Buy Page Listings ─────────────────────────────────────────────────────
  withCoords({
    id: "aparna",
    title: "Aparna Sarovar Grande 3BHK",
    location: "Nallagandla", city: "Hyderabad",
    display: "₹1.25 Cr", price: 12500000, currency: "INR",
    beds: 3, baths: 3, sqft: 1950, floor: "8th Floor", facing: "East",
    status: "Ready to Move", badge: "RERA", badgeNo: "P02400006789",
    aiScore: 8.4, type: "Apartment",
    images: [
      "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&q=80",
      "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&q=80",
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80",
    ],
    description: "Premium 3BHK by Aparna Constructions in Nallagandla — one of Hyderabad's fastest-growing residential corridors. East-facing unit, excellent cross-ventilation. Club house, pool, kids area. Proximity to IKEA, Gachibowli IT parks.",
    features: ["Club House", "Swimming Pool", "Landscaped Garden", "Gymnasium", "Indoor Games", "CCTV", "Intercom"],
  }),
  withCoords({
    id: "bhooja",
    title: "My Home Bhooja 3BHK",
    location: "Kokapet", city: "Hyderabad",
    display: "₹3.5 Cr", price: 35000000, currency: "INR",
    beds: 3, baths: 3, sqft: 2850, floor: "15th Floor", facing: "West",
    status: "Ready to Move", badge: "RERA", badgeNo: "P02400008234",
    aiScore: 9.2, type: "Apartment",
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
      "https://images.unsplash.com/photo-1594873604892-b599f847e859?w=800&q=80",
      "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800&q=80",
    ],
    description: "Iconic My Home Bhooja tower in Kokapet — Hyderabad's premium investment corridor. Unobstructed Gandipet lake views, ultra-premium finishes. World-class amenities across 25+ acres. Kokapet prices have doubled in 3 years.",
    features: ["Lake View", "Sky Deck", "Infinity Pool", "Concierge", "EV Charging", "Pet-Friendly", "Business Centre"],
  }),
  withCoords({
    id: "prestige",
    title: "Prestige Falcon City 2BHK",
    location: "Gachibowli", city: "Hyderabad",
    display: "₹85 Lakhs", price: 8500000, currency: "INR",
    beds: 2, baths: 2, sqft: 1250, floor: "4th Floor", facing: "North",
    status: "Under Construction", badge: "RERA", badgeNo: "P02400004521",
    aiScore: 7.8, type: "Apartment",
    images: [
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=80",
    ],
    description: "Prestige's signature 2BHK community in Gachibowli. Under construction with possession in Q3 2026. Excellent entry-price opportunity in IT hub. Projected 20-25% appreciation on possession.",
    features: ["Under Construction", "RERA Registered", "Swimming Pool", "Gymnasium", "Clubhouse", "Covered Parking"],
    legalChecklist: {
      rera: "verified", title: "verified", encumbrance: "verified", layout: "verified",
      permissions: "verified", taxReceipts: "na", occupancy: "pending",
      saleDeedChain: "verified", litigation: "verified",
    },
    constructionMilestones: [
      { id: "m1", title: "Foundation",              date: "2024-11-15", note: "Foundation and podium levels completed." },
      { id: "m2", title: "Structure",                date: "2025-06-20", note: "RCC structure completed up to 12th floor." },
      { id: "m3", title: "Brickwork",                 date: "2025-12-10", note: "Brickwork completed for towers A and B." },
      { id: "m4", title: "Plumbing & Electrical",     date: "2026-04-05", note: "MEP works in progress across all towers." },
    ],
    constructionPctComplete: 65,
    constructionExpectedCompletion: "2026-09-30",
  }),
  withCoords({
    id: "hmda-plot",
    title: "HMDA Prime Corner Plot",
    location: "Kollur", city: "Hyderabad",
    display: "₹45 Lakhs", price: 4500000, currency: "INR",
    sqft: 1800, floor: "Ground", facing: "East",
    status: "Ready", badge: "HMDA", badgeNo: "LP245/2024",
    aiScore: 8.1, type: "Plot",
    extra: "200 sqyd · 4 Guntas · 30ft Road",
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80",
      "https://images.unsplash.com/photo-1503387837-b154d5074bd2?w=800&q=80",
    ],
    description: "HMDA-approved corner residential plot in Kollur — the hottest emerging suburb. 30ft wide road access, east-facing, irregular shape adds FSI advantage. Perfect for construction or long-term appreciation. Clear title with patta.",
    features: ["Corner Plot", "East Facing", "30ft Wide Road", "HMDA Approved", "Clear Title", "Patta Available", "EB + Water Available"],
  }),
  withCoords({
    id: "vasavi",
    title: "Vasavi Signature Villa 4BHK",
    location: "Nallagandla", city: "Hyderabad",
    display: "₹2.8 Cr", price: 28000000, currency: "INR",
    beds: 4, baths: 4, sqft: 3200, floor: "G+2", facing: "North-East",
    status: "Ready to Move", badge: "RERA", badgeNo: "P02400007123",
    aiScore: 8.8, type: "Villa",
    extra: "200 sqyd · Vastu Compliant",
    images: [
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80",
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80",
    ],
    description: "Luxurious G+2 independent villa by Vasavi in Nallagandla's premium gated community. Vastu-perfect north-east facing, private courtyard, Italian marble flooring. Premium locality with excellent social infrastructure.",
    features: ["Private Courtyard", "Italian Marble", "Vastu Compliant", "Modular Kitchen", "Home Office", "3-Car Parking", "Solar Panels"],
  }),
  withCoords({
    id: "farmland",
    title: "Managed Farm Land — Shankarpally",
    location: "Shankarpally", city: "Rangareddy",
    // `display` keeps the buyer-facing "per acre" framing, but `price` is the total for the
    // full 2-acre parcel described by `sqft` below -- they must stay in the same units (total
    // vs total), or any price/sqft calculation elsewhere silently comes out 2x wrong.
    display: "₹25L/acre", price: 5000000, currency: "INR",
    sqft: 87120, floor: "Ground", facing: "East",
    status: "Available", badge: "PATTA", badgeNo: "Patta Available",
    aiScore: 7.5, type: "Farm Land",
    extra: "2 acres min · Borewell · Road Access",
    images: [
      "https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?w=800&q=80",
      "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=800&q=80",
      "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=800&q=80",
    ],
    description: "Fertile managed farmland near Shankarpally — the new eco-resort corridor. Borewell with 24/7 water supply, existing road access, red soil suitable for horticulture. 30% managed cultivation option available. Strong DTCP corridor appreciation.",
    features: ["Borewell", "Red Soil", "Road Access", "24/7 Water", "Managed Option", "Patta Available", "EC Clear"],
  }),
  withCoords({
    id: "kompally",
    title: "Commercial Shop — Kompally",
    location: "Kompally", city: "Hyderabad",
    display: "₹65 Lakhs", price: 6500000, currency: "INR",
    sqft: 450, floor: "Ground Floor", facing: "Main Road",
    status: "Ready", badge: "RERA", badgeNo: "P02400003344",
    aiScore: 7.9, type: "Commercial",
    extra: "High Footfall · Corner Shop",
    images: [
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
      "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=80",
      "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80",
    ],
    description: "High-visibility ground-floor commercial shop on Kompally's NH-44 arterial road. 10+ years established commercial zone. Corner unit with maximum frontage. Rental income potential: ₹40K-50K/month.",
    features: ["Main Road Frontage", "Corner Unit", "High Footfall", "NH-44 Arterial", "Covered Parking", "UG Sump + OHT"],
  }),
  withCoords({
    id: "rajapushpa",
    title: "Rajapushpa Provincia 3BHK",
    location: "Kokapet", city: "Hyderabad",
    display: "₹1.95 Cr", price: 19500000, currency: "INR",
    beds: 3, baths: 3, sqft: 2100, floor: "10th Floor", facing: "South-West",
    // badge/badgeNo intentionally omitted: this listing's RERA number was found during audit
    // to be an exact duplicate of prop-2's (P02400005678) -- two unrelated projects can't
    // share a registration. Clearing it rather than guessing a replacement; needs a real
    // verified number before this can show a RERA badge again.
    status: "Ready to Move",
    aiScore: 8.6, type: "Apartment",
    images: [
      "https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800&q=80",
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&q=80",
      "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=800&q=80",
    ],
    description: "Spacious 3BHK in Rajapushpa Provincia — a premium plotted development project in the Kokapet growth corridor. Investment-grade asset with proven track record. Excellent school and hospital proximity.",
    features: ["Club House", "Sports Arena", "Swimming Pool", "Jogging Track", "24×7 Security", "Power Backup", "Lift"],
  }),
];

export function findListingById(id: string): Listing | null {
  return ALL_LISTINGS.find(l => l.id === id) ?? null;
}

const NEARBY_RADIUS_KM = 5; // "nearby" means genuinely nearby — 1-5km, not just same city

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Genuinely nearby (1-5km, by real coordinates), closest first. Falls back to same-city
// (previous behaviour) only when the listing has no coordinates to measure distance from.
export function findNearbyListings(listing: Listing, max = 4): Listing[] {
  if (listing.lat == null || listing.lng == null) {
    return ALL_LISTINGS.filter(l => l.id !== listing.id && l.city === listing.city).slice(0, max);
  }
  return ALL_LISTINGS
    .filter(l => l.id !== listing.id && l.lat != null && l.lng != null)
    .map(l => ({ listing: l, dist: haversineKm(listing.lat!, listing.lng!, l.lat!, l.lng!) }))
    .filter(({ dist }) => dist <= NEARBY_RADIUS_KM)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, max)
    .map(({ listing: l }) => l);
}
