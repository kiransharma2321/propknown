export interface Listing {
  id: string;
  title: string;
  location: string;
  city: string;
  display: string;
  price: number;
  currency: string;
  sqft?: number;
  beds?: number;
  baths?: number;
  floor?: string;
  facing?: string;
  status: string;
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
    images: ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80"],
    description: "Spacious 3BHK apartment in the heart of Gachibowli IT hub. Premium finishes, modular kitchen, branded fittings. 24×7 security, power backup, covered parking. Walking distance to tech parks and malls.",
    features: ["Modular Kitchen", "Covered Parking", "24×7 Security", "Power Backup", "Gym", "Swimming Pool", "Children's Play Area"],
  }),
  withCoords({
    id: "prop-2",
    title: "Premium Villa — Financial District",
    location: "Financial District", city: "Hyderabad",
    display: "₹2.8 Cr", price: 28000000, currency: "INR",
    beds: 5, baths: 5, sqft: 5200, floor: "G+2", facing: "North",
    status: "Ready to Move", badge: "RERA", badgeNo: "P02400005678",
    aiScore: 9.2, type: "Villa",
    images: ["https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80"],
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
    images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"],
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
    images: ["https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80"],
    description: "Breathtaking sea-view apartment in Dubai Marina. Fully furnished, hotel-grade finishes. 8-10% rental yield. Ideal for NRI investors. 0% property tax, strong capital appreciation.",
    features: ["Sea View", "Fully Furnished", "Pool", "Gym", "Concierge", "1 Parking", "NRI-Friendly"],
  }),
  withCoords({
    id: "prop-5",
    title: "Office Space — HITEC City",
    location: "HITEC City", city: "Hyderabad",
    display: "₹1.2L/mo", price: 120000, currency: "INR",
    sqft: 2000, floor: "5th Floor", facing: "Main Road",
    status: "Available", badge: "RERA", badgeNo: "P02400009900",
    aiScore: 7.8, type: "Commercial",
    images: ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80"],
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
    images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80"],
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
    images: ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80"],
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
    images: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80"],
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
    images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"],
    description: "Prestige's signature 2BHK community in Gachibowli. Under construction with possession in Q3 2026. Excellent entry-price opportunity in IT hub. Projected 20-25% appreciation on possession.",
    features: ["Under Construction", "RERA Registered", "Swimming Pool", "Gymnasium", "Clubhouse", "Covered Parking"],
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
    images: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80"],
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
    images: ["https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80"],
    description: "Luxurious G+2 independent villa by Vasavi in Nallagandla's premium gated community. Vastu-perfect north-east facing, private courtyard, Italian marble flooring. Premium locality with excellent social infrastructure.",
    features: ["Private Courtyard", "Italian Marble", "Vastu Compliant", "Modular Kitchen", "Home Office", "3-Car Parking", "Solar Panels"],
  }),
  withCoords({
    id: "farmland",
    title: "Managed Farm Land — Shankarpally",
    location: "Shankarpally", city: "Rangareddy",
    display: "₹25L/acre", price: 2500000, currency: "INR",
    sqft: 87120, floor: "Ground", facing: "East",
    status: "Available", badge: "PATTA", badgeNo: "Patta Available",
    aiScore: 7.5, type: "Farm Land",
    extra: "2 acres min · Borewell · Road Access",
    images: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80"],
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
    images: ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80"],
    description: "High-visibility ground-floor commercial shop on Kompally's NH-44 arterial road. 10+ years established commercial zone. Corner unit with maximum frontage. Rental income potential: ₹40K-50K/month.",
    features: ["Main Road Frontage", "Corner Unit", "High Footfall", "NH-44 Arterial", "Covered Parking", "UG Sump + OHT"],
  }),
  withCoords({
    id: "rajapushpa",
    title: "Rajapushpa Provincia 3BHK",
    location: "Kokapet", city: "Hyderabad",
    display: "₹1.95 Cr", price: 19500000, currency: "INR",
    beds: 3, baths: 3, sqft: 2100, floor: "10th Floor", facing: "South-West",
    status: "Ready to Move", badge: "RERA", badgeNo: "P02400005678",
    aiScore: 8.6, type: "Apartment",
    images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80"],
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
