import { prisma } from "@/lib/db";

export async function createNotification(opts: {
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  try {
    await prisma.notification.create({ data: opts });
  } catch (e) {
    console.error("createNotification failed", e);
  }
}

export async function notifyNewSubmission(sub: { id: string; title: string; ownerName: string; city: string }) {
  await createNotification({
    type: "new_submission",
    title: `New submission: ${sub.title}`,
    body: `From ${sub.ownerName} in ${sub.city}`,
    link: `/admin/submissions`,
  });
}

export async function notifyNewLead(lead: { id: string; name: string; source: string; phone: string }) {
  await createNotification({
    type: "new_lead",
    title: `New lead: ${lead.name}`,
    body: `Via ${lead.source} — ${lead.phone}`,
    link: `/admin/leads`,
  });
}
