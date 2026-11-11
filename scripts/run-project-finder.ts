// Run the Auto Project Finder once: sourced project checks -> Approval Queue drafts.
// Run: npx tsx --env-file=.env scripts/run-project-finder.ts
import { draftsFromProjectChecks } from "@/lib/listings/finder";
draftsFromProjectChecks().then((r) => { for (const c of r.created) console.log("DRAFT", c); for (const m of r.merged) console.log("MERGED", m); console.log(`CREATED ${r.created.length} MERGED ${r.merged.length} SKIPPED ${r.skipped}`); process.exit(0); });
