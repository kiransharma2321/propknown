import type { NextRequest } from "next/server";

// Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` when CRON_SECRET is set as a project
// env var. Fails CLOSED in production: a missing CRON_SECRET there means every cron request is
// rejected (and logged), rather than every cron endpoint being publicly triggerable -- these
// routes spend Gemini/Tavily credits and send email. Locally (NODE_ENV !== "production") an
// unset secret is allowed so the jobs can be exercised by hand.
export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[cron] CRON_SECRET is not set -- rejecting cron request");
      return false;
    }
    return true;
  }
  const provided = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return provided === secret;
}
