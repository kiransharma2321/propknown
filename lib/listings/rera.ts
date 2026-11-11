import { RERA_STATES } from "@/lib/reraStates";

// When may a listing show a RERA badge? Only when a PropKnown reviewer has marked RERA as
// verified (verificationFlags.reraVerified) AND there is a number -- then with that number and
// the state RERA portal as the place to check it. An owner-entered number alone is not a badge,
// so a card can never say "✓ RERA" next to "Verification in progress". Pure function (no server
// imports) so client cards can use it and the accuracy tests can check it.

export interface ReraBadge { number: string; sourceLabel: string; sourceUrl: string | null }

const CITY_STATE: [RegExp, string][] = [
  [/hyderabad|secunderabad|telangana|kokapet|gachibowli|medchal|warangal/i, "TG"],
  [/bangalore|bengaluru|karnataka/i, "KA"],
  [/mumbai|pune|thane|maharashtra|nagpur/i, "MH"],
  [/andhra|vizag|visakhapatnam|vijayawada|guntur|amaravati/i, "AP"],
  [/chennai|tamil nadu|coimbatore/i, "TN"],
];

export function reraBadge(input: {
  reraNumber?: string | null;
  flags?: { reraVerified?: boolean; reraNumber?: string } | null;
  location?: string;
}): ReraBadge | null {
  const number = (input.flags?.reraNumber || input.reraNumber || "").trim();
  if (!input.flags?.reraVerified || !number) return null;
  const code = CITY_STATE.find(([re]) => re.test(input.location ?? ""))?.[1];
  const state = RERA_STATES.find((s) => s.code === code);
  return state
    ? { number, sourceLabel: state.authorityName, sourceUrl: state.portalUrl }
    : { number, sourceLabel: "the state RERA portal", sourceUrl: null };
}

// Card label for a listing's approval status. A verified RERA badge needs reviewer verification
// (reraBadge above); a number that hasn't been verified is shown as given, never as "Approved";
// no number at all -> "Approval details pending".
export function approvalLabel(input: Parameters<typeof reraBadge>[0]): { text: string; verified: boolean } {
  const badge = reraBadge(input);
  if (badge) return { text: `✓ RERA ${badge.number}`, verified: true };
  const number = (input.flags?.reraNumber || input.reraNumber || "").trim();
  return number ? { text: `RERA no. ${number} · not yet verified`, verified: false } : { text: "Approval details pending", verified: false };
}
