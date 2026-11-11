// Auto Listing Researcher test run (dry run unless --write): Hyderabad, 5 apartments, 3 villas,
// 3 DTCP/HMDA plot layouts, 2 farmland ventures. Writes a readable report of the drafts.
// Run: npx tsx --env-file=.env scripts/research-test.ts [--write] [report.md]
import { writeFileSync } from "fs";
import { runResearch } from "@/lib/research";
import { HIGH_CONFIDENCE, type FactKey } from "@/lib/research/rules";

const write = process.argv.includes("--write");
const out = process.argv.find((a) => a.endsWith(".md")) ?? "research-test.md";

(async () => {
  const r = await runResearch("Hyderabad", ["apartment", "villa", "plot_layout", "farmland"], {
    trigger: "test", dryRun: !write, perCategory: { apartment: 5, villa: 3, plot_layout: 3, farmland: 2 },
  });
  const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
  const L: string[] = [`# Auto Listing Researcher: Hyderabad test (${new Date().toLocaleString("en-IN")})`, "",
    `${write ? "Written to the Approval Queue" : "DRY RUN: nothing written (DB push 9 pending)"}. Stats: ${JSON.stringify(r.stats)}`, ""];
  for (const c of r.candidates) {
    const v = (k: FactKey) => c.facts[k]?.[0]?.value;
    L.push(`## ${v("name")} (${c.category.replace("_", " ")}), ${v("location")}`, "",
      `**Confidence ${c.confidence}/100${c.confidence >= HIGH_CONFIDENCE ? " (high)" : ""}** · price vs area: ${c.checks.priceVsArea}${c.checks.areaPrice ? ` (area ₹${c.checks.areaPrice}/sq ft)` : ""}` +
      `${c.checks.duplicateOf ? ` · DUPLICATE of ${c.checks.duplicateOf}` : ""}${c.checks.conflicts.length ? ` · CONFLICTS: ${c.checks.conflicts.join("; ")}` : ""}`,
      `Missing: ${c.checks.missing.join(", ") || "none"}`, "", "| Fact | Value | Source | Captured |", "|---|---|---|---|");
    for (const [k, list] of Object.entries(c.facts)) for (const f of list ?? []) L.push(`| ${k} | ${String(f.value).replace(/\|/g, "/")} | [${host(f.sourceUrl)}](${f.sourceUrl}) | ${f.capturedAt.slice(0, 10)} |`);
    L.push("", `Description (our words): ${c.description}`, c.priceNote ? `Price: ${c.priceNote}` : "Price: not stated by any source", "");
  }
  writeFileSync(out, L.join("\n"));
  console.log(`CANDIDATES ${r.candidates.length}`, JSON.stringify(r.stats));
  for (const c of r.candidates) console.log(`- [${c.category}] ${c.facts.name?.[0].value} | ${c.facts.location?.[0].value} | conf ${c.confidence} | ${c.checks.priceVsArea}${c.checks.duplicateOf ? " | DUP" : ""}`);
  process.exit(0);
})();
