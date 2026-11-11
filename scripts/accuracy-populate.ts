// Populate the broad accuracy suite: live checks for a fixed list of real projects and areas
// (paid Tavily/Gemini calls, within free quotas). Results are saved to the price cache by the
// normal engine -- the suite (tests/accuracy/broad.test.ts) then applies the general rules.
// Run: npx tsx --env-file=.env scripts/accuracy-populate.ts
import { checkProject } from "@/lib/projects";
import { getMarketPrice } from "@/lib/engine";

export const SUITE_PROJECTS: [string, string][] = [
  ["Kowsalya Manidweepam", "Bachupally, Hyderabad"], ["My Home Bhooja", "HITEC City, Hyderabad"], ["Prestige High Fields", "Financial District, Hyderabad"],
  ["Aparna Sarovar Grande", "Nallagandla, Hyderabad"], ["My Home Avatar", "Narsingi, Hyderabad"], ["Rajapushpa Provincia", "Narsingi, Hyderabad"],
  ["Prestige City Hyderabad", "Rajendra Nagar, Hyderabad"], ["Aparna Zenon", "Puppalaguda, Hyderabad"], ["Honer Vivantis", "Tellapur, Hyderabad"],
  ["My Home Tridasa", "Tellapur, Hyderabad"], ["Lodha Bellezza", "Kukatpally, Hyderabad"], ["ASBL Spectra", "Financial District, Hyderabad"],
  ["Vasavi Atlantis", "Narsingi, Hyderabad"], ["Prestige Lakeside Habitat", "Whitefield, Bangalore"], ["Sobha Dream Acres", "Panathur, Bangalore"],
  ["Brigade Cornerstone Utopia", "Varthur, Bangalore"], ["Godrej Splendour", "Whitefield, Bangalore"], ["Purva Palm Beach", "Hennur, Bangalore"],
  ["Embassy Lake Terraces", "Hebbal, Bangalore"], ["Lodha Amara", "Thane West, Mumbai"], ["Oberoi Esquire", "Goregaon East, Mumbai"],
  ["Runwal Gardens", "Dombivli, Mumbai"], ["Kalpataru Paramount", "Thane West, Mumbai"], ["Kolte Patil Life Republic", "Hinjewadi, Pune"],
  ["VTP Blue Waters", "Mahalunge, Pune"], ["Pride World City", "Charholi, Pune"], ["Prestige Bella Vista", "Porur, Chennai"],
  ["Brigade Xanadu", "Mogappair, Chennai"], ["DLF The Crest", "Golf Course Road, Gurugram"], ["M3M Golf Estate", "Golf Course Extension Road, Gurugram"],
  ["Emaar Beach Vista", "Dubai Harbour, Dubai"], ["Sobha Hartland", "Mohammed Bin Rashid City, Dubai"], ["Damac Lagoons", "Dubailand, Dubai"],
  ["Creek Rise", "Dubai Creek Harbour, Dubai"],
];
export const SUITE_AREAS: [string, string][] = [
  ["Kukatpally, Hyderabad", "apartment"], ["Miyapur, Hyderabad", "apartment"], ["Manikonda, Hyderabad", "apartment"], ["Tellapur, Hyderabad", "villa"],
  ["Kompally, Hyderabad", "plot"], ["Shamshabad, Hyderabad", "plot"], ["Gachibowli, Hyderabad", "commercial"], ["Sarjapur Road, Bangalore", "villa"],
  ["Electronic City, Bangalore", "apartment"], ["Hebbal, Bangalore", "apartment"], ["Yelahanka, Bangalore", "plot"], ["Powai, Mumbai", "apartment"],
  ["Thane West, Mumbai", "apartment"], ["Worli, Mumbai", "apartment"], ["Wakad, Pune", "apartment"], ["Baner, Pune", "apartment"],
  ["Kharadi, Pune", "commercial"], ["OMR, Chennai", "apartment"], ["Velachery, Chennai", "apartment"], ["Dwarka, Delhi", "apartment"],
  ["Sohna Road, Gurugram", "apartment"], ["New Town, Kolkata", "apartment"], ["Jumeirah Village Circle, Dubai", "apartment"], ["Downtown Dubai, Dubai", "apartment"],
  ["Dubai Hills Estate, Dubai", "villa"], ["Al Reem Island, Abu Dhabi", "apartment"], ["Stratford, London", "apartment"], ["Punggol, Singapore", "apartment"],
  ["North York, Toronto", "apartment"], ["Kokapet, Hyderabad", "plot"],
];

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  const q = [...items];
  await Promise.all(Array.from({ length: n }, async () => { while (q.length) await fn(q.shift()!); }));
}

async function main() {
  await pool(SUITE_PROJECTS, 2, async ([name, area]) => {
    const r = await checkProject({ name, area, propertyType: "apartment", refresh: true }).catch((e) => ({ found: false, error: String(e) }) as never);
    console.log("PROJECT", name, "|", r.found ? (r.price ? `${r.price.min}-${r.price.max} ${r.price.basis ?? ""}` : "found, no price") : "not found");
  });
  await pool(SUITE_AREAS, 2, async ([loc, type]) => {
    const c = await getMarketPrice({ location: loc, propertyType: type, tool: "seo_page", cacheOnly: true, skipLog: true }).catch(() => null);
    const r = c?.available ? c : await getMarketPrice({ location: loc, propertyType: type, tool: "cron_refresh", timeoutMs: 25_000 }).catch(() => null);
    console.log("AREA", loc, type, "|", r?.available ? `${r.currencySymbol}${r.currentPricePerSqft}/${r.pricePerSqftUnit}${c?.available ? " (cached)" : ""}` : `no price (${r?.reason ?? "error"})`);
  });
}
main().then(() => process.exit(0));
