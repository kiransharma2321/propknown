import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireMasterPage } from "@/lib/adminGuard";
import { normaliseChecklist } from "@/lib/listings/checklist";
import { DraftEditor, ReviewActions, type DraftView } from "../forms";
import ResearchFacts from "./ResearchFacts";

export const dynamic = "force-dynamic";

const day = (d: Date | string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

interface PriceCheck {
  status?: string; reason?: string; verdict?: string; message?: string; perSqft?: number; marketPerSqft?: number;
  range?: [number, number]; marketFetchedAt?: string; confidence?: { level: string; reason: string } | null; checkedAt?: string;
}

export default async function DraftPage({ params }: { params: { id: string } }) {
  await requireMasterPage();
  const d = await prisma.listingDraft.findUnique({ where: { id: params.id } }).catch(() => null);
  if (!d) notFound();
  const checklist = normaliseChecklist(d.checklist);
  const pc = (d.aiPriceCheck ?? {}) as PriceCheck;
  const view: DraftView = {
    id: d.id, projectName: d.projectName, builder: d.builder, location: d.location, city: d.city, state: d.state,
    propertyType: d.propertyType, configuration: d.configuration, sizeText: d.sizeText, sizeSqft: d.sizeSqft,
    projectStatus: d.projectStatus, possessionDate: d.possessionDate, reraNumber: d.reraNumber, price: d.price,
    priceSourceUrl: d.priceSourceUrl, description: d.description, checklist, reviewStatus: d.reviewStatus,
    approvalAuthority: d.approvalAuthority, approvalNumber: d.approvalNumber, priceNote: d.priceNote,
  };
  const photos = (() => { try { return JSON.parse(d.photoIds || "[]") as string[]; } catch { return []; } })();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/admin/approval-queue" className="text-xs text-gray-400 underline">← Approval Queue</Link>
      <h1 className="heading-h3 mt-2">{d.projectName}</h1>
      <p className="text-sm text-gray-500 mb-5">
        Source: {d.sourceUrl ? <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{d.sourceName ?? d.sourceUrl}</a> : d.sourceName ?? d.origin}
        {" "}· captured {day(d.fetchedAt)} · status <b>{d.reviewStatus}</b>
        {d.reviewedBy && <> by {d.reviewedBy} on {day(d.reviewedAt!)}</>}
        {d.rejectReason && <> · reason: {d.rejectReason}</>}
        {d.propertyId && <> · <Link href="/buy" className="underline">live on /buy</Link></>}
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <DraftEditor d={view} />
        <div className="space-y-4">
          {d.facts && <ResearchFacts id={d.id} facts={d.facts as Record<string, { value: string; sourceUrl: string; capturedAt: string }[]>} checks={d.checks as Record<string, unknown> | null} confidence={d.confidence} open={d.reviewStatus === "draft"} />}
          {photos.length > 0 && (
            <div className="card-dark p-3 grid grid-cols-3 gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {photos.map((id) => <a key={id} href={`/api/files/${id}`} target="_blank" rel="noopener noreferrer"><img src={`/api/files/${id}`} alt="Venture photo" className="w-full aspect-square object-cover rounded" /></a>)}
            </div>
          )}
          <div className="card-dark p-4 text-sm space-y-1">
            <p className="font-semibold text-gray-900">AI price check</p>
            {pc.status === "done" ? (
              <>
                <p className="capitalize">Verdict: <b>{pc.verdict}</b></p>
                <p className="text-gray-600">{pc.message}</p>
                <p className="text-xs text-gray-500">Stated ₹{pc.perSqft?.toLocaleString("en-IN")}/sq.ft vs area ₹{pc.marketPerSqft?.toLocaleString("en-IN")}/sq.ft{pc.range ? ` (range ₹${pc.range[0].toLocaleString("en-IN")}–${pc.range[1].toLocaleString("en-IN")})` : ""}</p>
                {pc.confidence && <p className="text-xs text-gray-500">{pc.confidence.level} confidence: {pc.confidence.reason}</p>}
                <p className="text-xs text-gray-400">Area data {pc.marketFetchedAt ? `from ${day(pc.marketFetchedAt)}` : ""}; checked {pc.checkedAt ? day(pc.checkedAt) : ""}. AI estimate — indicative only.</p>
              </>
            ) : (
              <p className="text-gray-500">{pc.reason ?? "Not run yet. Add a stated price, size and location, then save."}</p>
            )}
            {d.price != null && <p className="text-xs text-gray-500 pt-1">Price source: {d.priceSourceUrl ? <a href={d.priceSourceUrl} target="_blank" rel="noopener noreferrer" className="underline">link</a> : "pasted text"}{d.priceSourceDate ? `, ${day(d.priceSourceDate)}` : ""}</p>}
          </div>
          {d.reviewStatus === "draft" && <ReviewActions id={d.id} allChecked={checklist.every(Boolean)} />}
          {d.rawText && (
            <details className="card-dark p-4 text-xs text-gray-600">
              <summary className="cursor-pointer font-semibold text-gray-700">Source text the AI read</summary>
              <p className="mt-2 whitespace-pre-wrap max-h-96 overflow-auto">{d.rawText.slice(0, 8000)}</p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
