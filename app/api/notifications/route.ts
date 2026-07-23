import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, canRole } from "@/lib/rbac";

// Notification bodies quote lead names/phones -- admin/CRM staff only, same as /api/leads.
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canRole(session.role, "notifications"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unreadCount = notifications.filter(n => !n.isRead).length;
    return NextResponse.json({ notifications, unreadCount });
  } catch (e) {
    console.error("GET /api/notifications", e);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}

export async function PATCH(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canRole(session.role, "notifications"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { ids, markAllRead } = await req.json() as { ids?: string[]; markAllRead?: boolean };
    if (markAllRead) {
      await prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
    } else if (ids?.length) {
      await prisma.notification.updateMany({ where: { id: { in: ids } }, data: { isRead: true } });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/notifications", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
