import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/rbac";

// Just enough for client components to know who's logged in without a DB round-trip of their
// own -- e.g. the CRM sidebar hiding the Admin link for anyone who isn't Master Admin.
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ role: session.role, name: session.name });
}
