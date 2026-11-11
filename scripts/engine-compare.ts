// Old vs new engine: the current engine's stored result vs the Own Engine run live now, for a
// spread of areas and projects from the broad accuracy suite. PASS = within 5% of the current
// engine AND the general accuracy rules pass. Writes a markdown report.
// Run: npx tsx --env-file=.env scripts/engine-compare.ts [report.md] [--areas=N] [--projects=N]
import { writeFileSync } from "fs";
import { getMarketPrice } from "@/lib/engine";
import { checkProject, liveProjectOwn } from "@/lib/projects";
import { ownMarketPrice } from "@/lib/ownEngine";
import { checkPrice } from "@/lib/accuracyRules";
import { isPlausiblePrice, isUsableRange } from "@/lib/engine/plausibility";
import { canonicalUnit } from "@/lib/engine";
import { SUITE_AREAS, SUITE_PROJECTS } from "./accuracy-populate";

const arg = (k: string, d: number) => Number(process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d);
const out = process.argv.find((a) => a.endsWith(".md")) ?? "engine-compare.md";
type Row = { kind: string; label: string; old: number | null; neu: number | null; unit: string; diff: number | null; pass: boolean; note: string };

(async () => {
  const rows: Row[] = [], stats: Record<string, number> = {};
  const areas = SUITE_AREAS.slice(0, arg("areas", 12)), projects = SUITE_PROJECTS.filter((_, i) => i % 4 === 0).slice(0, arg("projects", 8));
  for (const [loc, type] of areas) {
    const old = await getMarketPrice({ location: loc, propertyType: type, tool: "seo_page", cacheOnly: true, skipLog: true }).catch(() => null);
    if (!old?.available) { rows.push({ kind: "area", label: `${loc} · ${type}`, old: null, neu: null, unit: "", diff: null, pass: false, note: "no current-engine price to compare (skipped)" }); continue; }
    const unit = String(old.pricePerSqftUnit ?? canonicalUnit(type, loc));
    let neu: Record<string, unknown> = {};
    try { neu = await ownMarketPrice(loc, type, unit, stats); } catch (e) { neu = { available: false, message: e instanceof Error ? e.message : String(e) }; }
    const o = Number(old.currentPricePerSqft), n = neu.available === false ? null : Number(neu.currentPricePerSqft) || null;
    const urls = ((neu.sourceUrls as string[]) ?? []);
    const fails = n ? checkPrice({ kind: "area", location: loc, price: n, min: Number(neu.priceRangeMin) || null, max: Number(neu.priceRangeMax) || null, currency: String(neu.currency ?? old.currency), unit, sourceUrls: urls, confidence: null, capturedAt: new Date().toISOString() })
      .filter((f) => f.rule !== "range not absurdly wide" || !isUsableRange(n, Number(neu.priceRangeMin), Number(neu.priceRangeMax))) : [];
    const diff = n ? Math.abs(n - o) / o : null;
    const plausible = n ? isPlausiblePrice(n, String(neu.currency ?? old.currency), unit) : false;
    rows.push({ kind: "area", label: `${loc} · ${type}`, old: o, neu: n, unit, diff, pass: !!n && diff! <= 0.05 && plausible && !fails.some((f) => f.rule !== "range not absurdly wide"),
      note: !n ? `own engine: ${String(neu.message ?? "no price")}`.slice(0, 140) : fails.map((f) => f.rule).join(", ") });
  }
  for (const [name, area] of projects) {
    const old = await checkProject({ name, area, cacheOnly: true }).catch(() => null);
    if (!old?.price) { rows.push({ kind: "project", label: `${name} (${area})`, old: null, neu: null, unit: "sqft", diff: null, pass: false, note: "no current-engine price (skipped)" }); continue; }
    let neu = null;
    try { neu = await liveProjectOwn(name, area); } catch (e) { stats.projectErrors = (stats.projectErrors ?? 0) + 1; console.error(name, e instanceof Error ? e.message : e); }
    const o = old.price.median, n = neu?.price?.median ?? null, diff = n ? Math.abs(n - o) / o : null;
    rows.push({ kind: "project", label: `${name} (${area})`, old: o, neu: n, unit: old.price.unit, diff, pass: !!n && diff! <= 0.05, note: n ? `${neu!.price!.basis ?? ""} · ${new Set(neu!.price!.sources.map((s) => s.host)).size} sites` : neu?.found === false ? "own engine: project not matched" : "own engine: no price" });
  }
  const compared = rows.filter((r) => r.old != null);
  const withNew = compared.filter((r) => r.neu != null);
  const diffs = withNew.map((r) => r.diff!).sort((a, b) => a - b);
  const median = diffs.length ? diffs[Math.floor(diffs.length / 2)] : null;
  const within = withNew.filter((r) => r.diff! <= 0.05).length;
  const L = [`# Old vs new engine (${new Date().toLocaleString("en-IN")})`, "",
    `Compared ${compared.length} items · own engine answered ${withNew.length} · within 5%: ${within} · median difference ${median != null ? (median * 100).toFixed(1) + "%" : "n/a"}`,
    `Own engine calls: ${JSON.stringify(stats)}`, "", "| Result | Item | Current engine | Own engine | Diff | Note |", "|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.old == null ? "SKIP" : r.pass ? "PASS" : "FAIL"} | ${r.kind} · ${r.label} | ${r.old?.toLocaleString("en-IN") ?? "—"} /${r.unit} | ${r.neu?.toLocaleString("en-IN") ?? "—"} | ${r.diff != null ? (r.diff * 100).toFixed(1) + "%" : "—"} | ${r.note.replace(/\|/g, "/")} |`)];
  writeFileSync(out, L.join("\n"));
  console.log(L.slice(0, 4).join("\n"));
  for (const r of rows) console.log(`${r.old == null ? "SKIP" : r.pass ? "PASS" : "FAIL"} ${r.kind} ${r.label} | old ${r.old} | new ${r.neu} | ${r.diff != null ? (r.diff * 100).toFixed(1) + "%" : "-"} | ${r.note.slice(0, 90)}`);
  process.exit(0);
})();
