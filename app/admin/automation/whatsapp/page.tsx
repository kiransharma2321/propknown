import { prisma } from "@/lib/db";
import { FEATURES } from "@/lib/features";
import { whatsappConfigured } from "@/lib/whatsapp/cloud";
import { canMessage, inWindow } from "@/lib/whatsapp/rules";
import { TEMPLATES } from "@/lib/whatsapp/automation";
import { replyAction, takeoverAction, saveTemplateAction, submitTemplateAction, refreshTemplatesAction } from "./actions";

export const dynamic = "force-dynamic";

// M12: WhatsApp Inbox + Template manager (master only via the automation layout).
const TICKS: Record<string, string> = { sent: "✓ sent", delivered: "✓✓ delivered", read: "✓✓ read", failed: "✗ failed", received: "received" };

export default async function WhatsAppPage({ searchParams }: { searchParams: { c?: string } }) {
  if (!FEATURES.whatsapp) return <p className="text-sm text-gray-500">WhatsApp is switched off (feature flag NEXT_PUBLIC_FEATURE_WHATSAPP).</p>;
  let contacts: Awaited<ReturnType<typeof prisma.whatsAppContact.findMany>> = [];
  let templates: Awaited<ReturnType<typeof prisma.whatsAppTemplate.findMany>> = [];
  try {
    [contacts, templates] = await Promise.all([
      prisma.whatsAppContact.findMany({ orderBy: { updatedAt: "desc" }, take: 100 }),
      prisma.whatsAppTemplate.findMany({ orderBy: { createdAt: "desc" } }),
    ]);
  } catch { return <p className="text-amber-700 text-sm">The WhatsApp tables aren&apos;t in the database yet (DB push pending).</p>; }
  const active = contacts.find((c) => c.phone === searchParams.c) ?? contacts[0];
  const messages = active ? await prisma.whatsAppMessage.findMany({ where: { phone: active.phone }, orderBy: { createdAt: "asc" }, take: 200 }) : [];
  const inp = "input-dark text-sm py-2 px-2 w-full mt-0.5";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="heading-h3">WhatsApp</h1>
        <p className="text-sm text-gray-500">Meta WhatsApp Cloud API. Only people who ticked the consent box (or wrote to us first) are messaged; STOP opts them out. {whatsappConfigured() ? "Connected." : <b className="text-amber-700">Not connected yet: add the WHATSAPP_* settings (see WhatsApp-Setup-Guide.md).</b>}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="border border-gray-200 rounded-xl bg-white divide-y max-h-[560px] overflow-y-auto">
          {contacts.length === 0 && <p className="p-3 text-sm text-gray-500">No chats yet.</p>}
          {contacts.map((c) => (
            <a key={c.phone} href={`?c=${c.phone}`} className={`block p-3 text-sm ${c.phone === active?.phone ? "bg-amber-50" : ""}`}>
              <b>{c.name ?? `+${c.phone}`}</b>
              <span className="block text-xs text-gray-500">+{c.phone} · {c.optedOutAt && !canMessage(c) ? "opted out" : c.consentAt ? "consented" : "no consent"} · {c.humanTakeoverAt ? "you" : c.aiEnabled ? "KnownAI" : "manual"}</span>
            </a>
          ))}
        </div>
        {active && (
          <div className="border border-gray-200 rounded-xl bg-white p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div><b>{active.name ?? `+${active.phone}`}</b> <span className="text-xs text-gray-500">+{active.phone}{active.leadId ? ` · lead ${active.leadId}` : ""}{active.consentAt ? ` · consent ${active.consentAt.toLocaleDateString("en-IN")} (${active.consentSource})` : ""}</span></div>
              <form action={takeoverAction}>
                <input type="hidden" name="phone" value={active.phone} />
                <input type="hidden" name="mode" value={active.humanTakeoverAt ? "ai" : "human"} />
                <button type="submit" className="text-xs underline text-[#7A5C1A]">{active.humanTakeoverAt ? "Hand back to KnownAI" : "Take over from KnownAI"}</button>
              </form>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {messages.map((m) => (
                <div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-line ${m.direction === "in" ? "bg-gray-100" : "bg-emerald-50 ml-auto"}`}>
                  {m.body}
                  <span className="block text-[10px] text-gray-500 mt-1">{m.createdAt.toLocaleString("en-IN")} · {m.byAi ? "KnownAI · " : m.sentBy ? `${m.sentBy} · ` : ""}{TICKS[m.status] ?? m.status}{m.error ? ` · ${m.error}` : ""}</span>
                </div>
              ))}
            </div>
            {inWindow(active) ? (
              <form action={replyAction} className="flex gap-2">
                <input type="hidden" name="phone" value={active.phone} />
                <input name="text" required className="input-dark text-sm py-2 px-2 flex-1" placeholder="Type a reply (KnownAI stops replying to this chat)" />
                <button className="btn-primary text-sm">Send</button>
              </form>
            ) : <p className="text-xs text-gray-500">More than 24 hours since they last wrote, so WhatsApp only allows an approved template.</p>}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Templates</h2>
          <form action={refreshTemplatesAction}><button className="text-xs underline text-[#7A5C1A]">Refresh status from Meta</button></form>
        </div>
        <p className="text-xs text-gray-500">The automations use: {Object.values(TEMPLATES).join(", ")}. Create each here, submit it, and wait for Meta&apos;s approval (usually minutes to a day).</p>
        <form action={saveTemplateAction} className="border border-gray-200 rounded-xl p-4 bg-white grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-gray-700">Name (lowercase_underscores)<input name="name" required pattern="[a-z0-9_]+" className={inp} placeholder="lead_welcome" /></label>
          <label className="text-xs text-gray-700">Category<select name="category" className={inp}><option>UTILITY</option><option>MARKETING</option></select></label>
          <label className="text-xs text-gray-700">Language<input name="language" defaultValue="en" className={inp} /></label>
          <label className="text-xs text-gray-700 sm:col-span-3">Body (use {"{{1}}"} for the first name)<textarea name="body" required rows={3} className={inp} placeholder="Hi {{1}}, thanks for checking prices on PropKnown. Reply here with any question, or STOP to opt out." /></label>
          <label className="text-xs text-gray-700 sm:col-span-2">Sample values, separated by | (Meta needs them)<input name="example" className={inp} placeholder="Ravi" /></label>
          <div className="flex items-end"><button className="btn-primary text-sm">Save draft</button></div>
        </form>
        {templates.map((t) => (
          <div key={t.id} className="border border-gray-200 rounded-lg p-3 bg-white text-sm flex flex-wrap items-start justify-between gap-2">
            <div className="max-w-2xl"><b>{t.name}</b> <span className="text-xs text-gray-500">{t.category} · {t.language} · <b>{t.status}</b>{t.reason ? ` · ${t.reason}` : ""}</span><p className="text-xs text-gray-700 mt-1 whitespace-pre-line">{t.body}</p></div>
            {(t.status === "draft" || t.status === "REJECTED") && (
              <form action={submitTemplateAction}><input type="hidden" name="id" value={t.id} /><button className="text-xs underline text-[#7A5C1A]">Submit to Meta</button></form>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
