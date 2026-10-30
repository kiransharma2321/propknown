// RERA scanner -- jurisdiction-aware RERA guidance shared by Legal Shield, KnownAI chat and the
// voice agent's check_rera_guidance(). Honest by design: PropKnown does NOT query government
// registries live, so this never says a number "is registered". It only says whether the number
// looks like the format that authority issues, and exactly where to verify it yourself.

import { RERA_STATES, type ReraState } from "@/lib/reraStates";
import { matchLocality } from "@/lib/localities";

export type ReraFormat = "missing" | "matches_known_format" | "unusual_format" | "no_known_format";

export interface ReraGuidance {
  jurisdiction: string;          // "Telangana", "Dubai (UAE)", or "Unknown"
  authority: string;
  portalUrl: string | null;
  format: ReraFormat;
  formatNote: string;
  steps: string[];
}

// Publicly documented registration-number shapes. Only used to flag "this doesn't look like
// what that authority issues" -- a matching format is NOT proof of registration.
const FORMATS: Record<string, { re: RegExp; example: string }> = {
  TG: { re: /^[PA]\d{11}$/i, example: "P02400001234" },
  MH: { re: /^[PA]5\d{10}$/i, example: "P51800012345" },
  KA: { re: /^PR[MJ]\/KA\/RERA\/[\w/]+$/i, example: "PRM/KA/RERA/1251/309/PR/171014/000287" },
  AP: { re: /^P\d{11}$/i, example: "P03190012345" },
  TN: { re: /^TN\/\d{2}\/(Building|Layout)\/\d+\/\d{4}$/i, example: "TN/01/Building/0123/2024" },
};

const STATE_KEYWORDS: [string, string[]][] = [
  ["TG", ["hyderabad", "secunderabad", "telangana", "warangal", "medchal", "rangareddy", "sangareddy"]],
  ["AP", ["andhra", "vijayawada", "visakhapatnam", "vizag", "guntur", "amaravati", "tirupati"]],
  ["KA", ["bangalore", "bengaluru", "karnataka", "mysore", "mysuru", "mangalore"]],
  ["MH", ["mumbai", "pune", "thane", "navi mumbai", "nagpur", "maharashtra"]],
  ["TN", ["chennai", "coimbatore", "tamil nadu", "madurai"]],
  ["DL", ["delhi"]],
  ["HR", ["gurgaon", "gurugram", "haryana", "faridabad"]],
  ["UP", ["noida", "lucknow", "ghaziabad", "uttar pradesh"]],
  ["GJ", ["ahmedabad", "surat", "gujarat", "vadodara"]],
  ["WB", ["kolkata", "west bengal"]],
  ["GA", ["goa"]],
  ["KL", ["kochi", "kerala", "trivandrum", "thiruvananthapuram"]],
];

const UAE_WORDS = ["dubai", "uae", "abu dhabi", "sharjah", "ajman", "ras al khaimah"];

export function detectJurisdiction(input: { location?: string; state?: string }): ReraState | "UAE" | null {
  const raw = `${input.state ?? ""} ${input.location ?? ""}`.toLowerCase();
  if (UAE_WORDS.some((w) => raw.includes(w))) return "UAE";
  const byCode = input.state ? RERA_STATES.find((s) => s.code.toLowerCase() === input.state!.trim().toLowerCase() || s.name.toLowerCase() === input.state!.trim().toLowerCase()) : undefined;
  if (byCode) return byCode;
  const loc = input.location ? matchLocality(input.location) : null;
  if (loc?.citySlug === "dubai") return "UAE";
  if (loc?.citySlug === "hyderabad") return RERA_STATES.find((s) => s.code === "TG")!;
  if (loc?.citySlug === "bangalore") return RERA_STATES.find((s) => s.code === "KA")!;
  for (const [code, words] of STATE_KEYWORDS) {
    if (words.some((w) => raw.includes(w))) return RERA_STATES.find((s) => s.code === code) ?? null;
  }
  return null;
}

export function reraGuidance(input: { location?: string; state?: string; reraNumber?: string }): ReraGuidance {
  const num = input.reraNumber?.trim() ?? "";
  const j = detectJurisdiction(input);

  if (j === "UAE") {
    const plausible = /^\d{4,12}$/.test(num.replace(/\s/g, ""));
    return {
      jurisdiction: "Dubai (UAE)",
      authority: "Dubai Land Department (DLD) / RERA Dubai",
      portalUrl: "https://dubailand.gov.ae/en/eservices/",
      format: !num ? "missing" : plausible ? "matches_known_format" : "unusual_format",
      formatNote: !num
        ? "No permit number given. Every advertised Dubai listing must carry a DLD Trakheesi permit number and the broker's ORN/BRN."
        : plausible
          ? "Looks like a numeric DLD permit / broker number. Format alone doesn't prove it's valid — check it on the DLD or Dubai REST app."
          : "This doesn't look like a DLD Trakheesi permit or ORN/BRN number (both are numeric). Ask the agent for the official permit number.",
      steps: [
        "Check the listing's Trakheesi permit number and the broker's BRN in the Dubai REST app or on dubailand.gov.ae.",
        "For off-plan, confirm the project is registered with DLD and that payments go to the project's escrow account.",
        "Verify the title deed (or Oqood for off-plan) with DLD before paying any deposit.",
      ],
    };
  }

  if (!j) {
    return {
      jurisdiction: "Unknown",
      authority: "State RERA authority",
      portalUrl: null,
      format: num ? "no_known_format" : "missing",
      formatNote: num
        ? "We couldn't tell which state's RERA applies from the location given, so we can't check the number's format."
        : "No RERA number given. Most new residential projects and agents in India must be RERA-registered.",
      steps: [
        "Find the project's state RERA portal and search the number there yourself.",
        "Make sure the registered promoter name and project address match the seller's documents.",
      ],
    };
  }

  const fmt = FORMATS[j.code];
  let format: ReraFormat;
  let formatNote: string;
  if (!num) {
    format = "missing";
    formatNote = `No RERA number given. New projects in ${j.name} must be registered with ${j.authorityName}; resale of an older, completed flat may not need one, but ask.`;
  } else if (!fmt) {
    format = "no_known_format";
    formatNote = `We don't have a published number format for ${j.authorityName} to compare against. Search it on the portal directly.`;
  } else if (fmt.re.test(num.replace(/\s/g, ""))) {
    format = "matches_known_format";
    formatNote = `Matches the usual ${j.authorityName} format (e.g. ${fmt.example}). Format alone isn't proof — confirm it on the portal.`;
  } else {
    format = "unusual_format";
    formatNote = `Doesn't match the usual ${j.authorityName} format (e.g. ${fmt.example}). Could be a typo, an agent number, or not genuine — check before proceeding.`;
  }
  return {
    jurisdiction: j.name,
    authority: j.authorityName,
    portalUrl: j.portalUrl,
    format,
    formatNote,
    steps: [
      `Search the number on ${j.authorityName}'s official portal (${j.portalUrl}) — not just the number printed in the ad.`,
      "Check the registered promoter name, project address, approved plan and completion date match what you're being sold.",
      "Look for complaints or orders against the project on the same portal.",
    ],
  };
}
