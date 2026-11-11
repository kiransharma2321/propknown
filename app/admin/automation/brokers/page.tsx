import { revalidatePath } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { FEATURES } from "@/lib/features";
import { masterApiSession } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

// Broker / channel-partner accounts (master only via the automation layout): approve or suspend.
async function setStatus(form: FormData) {
  "use server";
  const s = await masterApiSession();
  if (!s || !FEATURES.listingResearcher) return;
  const status = String(form.get("status"));
  if (!["approved", "suspended", "pending"].includes(status)) return;
  await prisma.broker.update({ where: { id: String(form.get("id")) }, data: { status, ...(status === "approved" ? { approvedBy: s.name, approvedAt: new Date() } : {}) } });
  revalidatePath("/admin/automation/brokers");
}

export default async function BrokersPage() {
  if (!FEATURES.listingResearcher) return <p className="text-sm text-gray-500">The broker portal is switched off (feature flag NEXT_PUBLIC_FEATURE_LISTING_RESEARCHER).</p>;
  const brokers = await prisma.broker.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true, name: true, firm: true, email: true, phone: true, reraAgentNo: true, status: true, createdAt: true } }).catch(() => null);
  if (!brokers) return <p className="text-amber-700 text-sm">The brokers table isn&apos;t in the database yet (DB push pending).</p>;
  return (
    <div className="space-y-4">
      <h1 className="heading-h3">Brokers & channel partners</h1>
      <p className="text-sm text-gray-500">Partners register at <Link href="/broker" className="underline">/broker</Link>. Check their RERA agent number on the state RERA portal before approving. Approved partners can upload CSVs; every row still goes through the <Link href="/admin/approval-queue?origin=broker_csv" className="underline">Approval Queue</Link>.</p>
      <table className="w-full text-sm"><thead><tr className="text-left text-xs text-gray-400"><th className="py-1">Partner</th><th>Contact</th><th>RERA agent no.</th><th>Status</th><th /></tr></thead><tbody>
        {brokers.map((b) => (
          <tr key={b.id} className="border-t border-gray-100">
            <td className="py-2"><b>{b.name}</b>{b.firm ? <span className="block text-xs text-gray-500">{b.firm}</span> : null}</td>
            <td className="text-xs">{b.email}<br />{b.phone}</td><td className="text-xs">{b.reraAgentNo ?? "—"}</td><td className="capitalize">{b.status}</td>
            <td className="text-right">{(["approved", "suspended"] as const).filter((st) => st !== b.status).map((st) => (
              <form key={st} action={setStatus} className="inline ml-2"><input type="hidden" name="id" value={b.id} /><input type="hidden" name="status" value={st} /><button className="text-xs underline text-[#7A5C1A]">{st === "approved" ? "Approve" : "Suspend"}</button></form>
            ))}</td>
          </tr>
        ))}
        {brokers.length === 0 && <tr><td colSpan={5} className="py-2 text-gray-400">No partners yet.</td></tr>}
      </tbody></table>
    </div>
  );
}
