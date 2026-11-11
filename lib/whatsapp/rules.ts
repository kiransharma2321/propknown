// M12 WhatsApp: pure rules (phone format, intents, 24-hour window, follow-up timing, consent).
// No database or network here, so every rule is unit-tested.

export const WINDOW_MS = 24 * 60 * 60 * 1000;
const DAY = 86_400_000;

// Digits with country code, no "+". 10-digit Indian mobiles get 91. Returns null if invalid.
export function normalisePhone(raw: string): string | null {
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (/^0?[6-9]\d{9}$/.test(d)) d = `91${d.slice(-10)}`;
  return /^[1-9]\d{9,14}$/.test(d) ? d : null;
}

export type Intent = "stop" | "start" | "human" | "hot" | "question";
const STOP = /^\s*(stop|unsubscribe|opt[\s-]?out|cancel|ruko|band karo|aapu|vaddu)\s*[.!]*\s*$/i;
const START = /^\s*(start|subscribe|opt[\s-]?in)\s*[.!]*\s*$/i;
const HUMAN = /\b(talk to (a |an )?(human|person|agent|someone|raghu)|call me|human|agent|speak to)\b/i;
const HOT = /\b(site visit|book(ing)?|token|ready to buy|buy now|visit (the )?(site|project)|schedule|loan approved|budget (is|of)|\d+\s*(lakh|lac|cr|crore))\b/i;

export function classify(text: string): Intent {
  if (STOP.test(text)) return "stop";
  if (START.test(text)) return "start";
  if (HUMAN.test(text)) return "human";
  if (HOT.test(text)) return "hot";
  return "question";
}

export interface ContactState { consentAt: Date | null; optedOutAt: Date | null; lastInboundAt: Date | null; humanTakeoverAt: Date | null; aiEnabled: boolean; followupStep: number; followupStartedAt: Date | null }

// Business-initiated (template) messages need logged consent and no opt-out after it.
export function canMessage(c: ContactState): boolean {
  return !!c.consentAt && (!c.optedOutAt || c.optedOutAt < c.consentAt);
}
// Free-form replies only within 24 hours of the person's last message (Meta rule).
export function inWindow(c: ContactState, now = Date.now()): boolean {
  return !!c.lastInboundAt && now - c.lastInboundAt.getTime() < WINDOW_MS;
}
export function aiMayReply(c: ContactState, now = Date.now()): boolean {
  return c.aiEnabled && !c.humanTakeoverAt && inWindow(c, now) && !(c.optedOutAt && (!c.consentAt || c.optedOutAt > c.consentAt));
}

// Day-2 / day-5 follow-ups: only to consented contacts who haven't replied since the welcome.
export function followupDue(c: ContactState, now = Date.now()): "day2" | "day5" | null {
  if (!canMessage(c) || !c.followupStartedAt) return null;
  if (c.lastInboundAt && c.lastInboundAt > c.followupStartedAt) return null; // they replied -> stop
  const age = now - c.followupStartedAt.getTime();
  if (c.followupStep === 1 && age >= 2 * DAY) return "day2";
  if (c.followupStep === 2 && age >= 5 * DAY) return "day5";
  return null;
}

// Meta template names: lowercase letters, digits, underscores.
export const validTemplateName = (n: string) => /^[a-z0-9_]{1,512}$/.test(n);
export const placeholderCount = (body: string) => new Set(body.match(/\{\{\d+\}\}/g) ?? []).size;

export const CONSENT_TEXT = "Send me property updates and replies on WhatsApp. I can reply STOP at any time.";
