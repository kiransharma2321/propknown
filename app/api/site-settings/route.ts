import { NextResponse } from "next/server";
import { getCallbackText } from "@/lib/siteSettings";

// Public, non-secret site wording for client components (cached 5 minutes).
export const revalidate = 300;

export async function GET() {
  return NextResponse.json({ callbackText: await getCallbackText() });
}
