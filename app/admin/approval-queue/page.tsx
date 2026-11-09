import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireMasterPage } from "@/lib/adminGuard";
import { normaliseChecklist } from "@/lib/listings/checklist";
import { QuickAddForm } from "./forms";

export const dynamic = "force-dynamic";

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const STATUSES = ["draft", "approved", "rejected"] as const;

export default async function ApprovalQueuePage({ searchParams }: { searchParams: { status?: string } }) {
  await requireMasterPage();
  const status = STATUSES.includes(searchParams.status as (typeof STATUSES)[number]) ? searchParams.status! : "draft";

  let drafts: Awaited<ReturnType<typeof prisma.listingDraft.findMany>> = [];
  let missing = false;
  try {
    drafts = await prisma.listingDraft.findMany({ where: { reviewStatus: status }, orderBy: { createdAt: "desc" }, take: 100 });
  } catch { missing = true; }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/admin/automation" className="text-xs text-gray-400 underline">← Automation</Link>
      <h1 className="heading-h3 mt-2">Approval Queue</h1>
      <p className="text-gray-500 text-sm mb-5">AI-drafted listings wait here. Each needs all 10 checklist items ticked by you before it can go live on /buy with the Verified badge. Nothing is published automatically.</p>
      {missing && <p className="mb-4 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">The listing_drafts table hasn&apos;t been created yet: run the pending database update first.</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="flex gap-2 mb-3">
            {STATUSES.map((s) => (
              <Link key={s} href={`?status=${s}`} className={`text-xs px-3 py-1 rounded-full border capitalize ${s === status ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-600"}`}>{s}</Link>
            ))}
          </div>
          <div className="space-y-2">
            {drafts.length === 0 && <p className="text-sm text-gray-400">Nothing {status === "draft" ? "waiting for review" : status} yet.</p>}
            {drafts.map((d) => {
              const ticks = normaliseChecklist(d.checklist).filter(Boolean).length;
              const check = (d.aiPriceCheck ?? {}) as { status?: string; verdict?: string };
              return (
                <Link key={d.id} href={`/admin/approval-queue/${d.id}`} className="card-dark p-3 flex items-center justify-between gap-3 hover:border-gray-400">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{d.projectName}</p>
                    <p className="text-xs text-gray-500 truncate">{[d.location, d.city].filter(Boolean).join(", ") || "No location"} · {d.reraNumber ? `RERA ${d.reraNumber}` : "no RERA no."} · {d.sourceName ?? d.origin} · {day(d.createdAt)}</p>
                  </div>
                  <div className="text-right shrink-0 text-xs">
                    <p className="tabular-nums">{ticks}/10 ✓</p>
                    <p className="text-gray-400">{check.status === "done" ? `price: ${check.verdict}` : check.status === "skipped" ? "no price check" : check.status ?? ""}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
        {!missing && <QuickAddForm />}
      </div>
    </div>
  );
}
