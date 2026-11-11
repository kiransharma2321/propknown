import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FEATURES } from "@/lib/features";
import { getBrokerSession } from "@/lib/brokers/auth";
import { CSV_COLUMNS, OWNERSHIP_DECLARATION } from "@/lib/brokers/csv";
import { LoginSignup, UploadForm } from "./BrokerForms";
import { logoutAction } from "./actions";

export const metadata: Metadata = { title: "Broker & Channel Partner Portal", robots: { index: false } };
export const dynamic = "force-dynamic";

// Broker / channel-partner portal: resale and partner stock comes in here (with an ownership /
// authorisation declaration), never by scraping individual sellers.
export default async function BrokerPage() {
  if (!FEATURES.listingResearcher) notFound();
  const b = await getBrokerSession();
  const mine = b ? await prisma.listingDraft.findMany({ where: { brokerId: b.id }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, projectName: true, location: true, city: true, reviewStatus: true, rejectReason: true, createdAt: true } }) : [];
  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-5xl mx-auto px-6 space-y-6">
        <div>
          <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "var(--gold-text)" }}>Channel Partners</p>
          <h1 className="heading-h1">Broker Portal</h1>
          <p className="text-gray-500 mt-2 max-w-2xl">List the resale and partner properties you are authorised to market. PropKnown checks each one before it goes live, and buyer enquiries reach you through our CRM.</p>
        </div>
        {!b ? <LoginSignup /> : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p>Logged in as <b>{b.name}</b>{b.firm ? ` (${b.firm})` : ""} · account <b>{b.status}</b></p>
              <form action={logoutAction}><button className="underline text-xs">Log out</button></form>
            </div>
            {b.status === "approved" ? <UploadForm declaration={OWNERSHIP_DECLARATION} columns={CSV_COLUMNS} /> : <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Your account is waiting for approval. Uploads open once PropKnown approves it.</p>}
            <div>
              <h2 className="font-semibold mb-2">Your listings</h2>
              <table className="w-full text-sm"><tbody>
                {mine.map((d) => <tr key={d.id} className="border-t border-gray-100"><td className="py-1.5">{d.projectName}</td><td className="text-gray-500">{[d.location, d.city].filter(Boolean).join(", ")}</td><td className="capitalize">{d.reviewStatus === "draft" ? "in review" : d.reviewStatus}{d.rejectReason ? `: ${d.rejectReason}` : ""}</td><td className="text-gray-400 text-xs">{d.createdAt.toLocaleDateString("en-IN")}</td></tr>)}
                {mine.length === 0 && <tr><td className="py-2 text-gray-400">Nothing uploaded yet.</td></tr>}
              </tbody></table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
