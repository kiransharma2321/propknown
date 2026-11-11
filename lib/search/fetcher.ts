import { recordApiCall } from "@/lib/engine/usage";

// PropKnown Own Engine: page fetcher. Public http(s) pages only (no private / local addresses),
// robots.txt respected for our user agent, size and time capped. Returns readable text with
// scripts, styles and tags stripped. Text is used only to EXTRACT facts; it is never republished
// (descriptions are written by us from the facts, and photos are never taken from pages).

export const USER_AGENT = "PropKnownBot/1.0 (+https://www.propknown.com)";
const UA_TOKEN = "propknownbot";
const robotsCache = new Map<string, { rules: { allow: boolean; path: string }[]; at: number }>();

export class FetchBlocked extends Error {}

export function isPublicUrl(u: URL): boolean {
  if (!/^https?:$/.test(u.protocol)) return false;
  return !(/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?$|169\.254\.)/i.test(u.hostname) || u.hostname.endsWith(".local") || u.hostname.endsWith(".internal"));
}

// robots.txt: the group for our agent if present, otherwise "*". Longest matching rule wins;
// Allow beats Disallow on a tie. "$" and "*" wildcards are supported.
export function parseRobots(txt: string): { allow: boolean; path: string }[] {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
  let cur: (typeof groups)[number] | null = null, lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const [, k, v] = m; const key = k.toLowerCase();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(v.toLowerCase()); lastWasAgent = true;
    } else if (cur && (key === "allow" || key === "disallow")) {
      lastWasAgent = false;
      if (v || key === "allow") cur.rules.push({ allow: key === "allow", path: v });
    } else lastWasAgent = false;
  }
  const mine = groups.find((g) => g.agents.some((a) => a !== "*" && UA_TOKEN.includes(a)));
  return (mine ?? groups.find((g) => g.agents.includes("*")))?.rules ?? [];
}

export function robotsAllows(rules: { allow: boolean; path: string }[], pathAndQuery: string): boolean {
  let best: { allow: boolean; len: number } | null = null;
  for (const r of rules) {
    if (!r.path) continue;
    const re = new RegExp("^" + r.path.replace(/[.+?^${}()|[\]\\]/g, (c) => (c === "$" ? "$" : `\\${c}`)).replace(/\\\$$/, "$").replace(/\*/g, ".*"));
    if (re.test(pathAndQuery) && (!best || r.path.length > best.len || (r.path.length === best.len && r.allow))) best = { allow: r.allow, len: r.path.length };
  }
  return best ? best.allow : true;
}

async function robotsFor(u: URL) {
  const hit = robotsCache.get(u.origin);
  if (hit && Date.now() - hit.at < 24 * 3_600_000) return hit.rules;
  let rules: { allow: boolean; path: string }[] = [];
  const res = await fetch(`${u.origin}/robots.txt`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(6_000) }).catch(() => null);
  if (res?.ok) rules = parseRobots((await res.text()).slice(0, 200_000));
  // 401/403 on robots.txt: treat the whole site as disallowed (Google's rule); 404: all allowed.
  else if (res && (res.status === 401 || res.status === 403)) rules = [{ allow: false, path: "/" }];
  robotsCache.set(u.origin, { rules, at: Date.now() });
  return rules;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#8377;|&#x20b9;|&#x20B9;/g, "₹").replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

export async function fetchPage(url: string, o: { timeoutMs?: number; maxChars?: number } = {}): Promise<{ url: string; text: string; fetchedAt: string }> {
  let u: URL;
  try { u = new URL(url); } catch { throw new FetchBlocked("invalid URL"); }
  if (!isPublicUrl(u)) throw new FetchBlocked("not a public address");
  if (!robotsAllows(await robotsFor(u), u.pathname + u.search)) throw new FetchBlocked(`robots.txt disallows ${u.hostname}${u.pathname}`);
  const res = await fetch(u, { headers: { "User-Agent": USER_AGENT, Accept: "text/html,text/plain" }, redirect: "follow", signal: AbortSignal.timeout(o.timeoutMs ?? 12_000) })
    .catch((e) => { recordApiCall("fetch", "error"); throw e; });
  recordApiCall("fetch", res.ok ? "ok" : res.status === 429 ? "rate_limited" : "error");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!/text\/html|text\/plain/.test(res.headers.get("content-type") ?? "")) throw new Error("not a web page");
  const text = htmlToText((await res.text()).slice(0, 1_500_000)).slice(0, o.maxChars ?? 40_000);
  return { url: res.url || url, text, fetchedAt: new Date().toISOString() };
}
