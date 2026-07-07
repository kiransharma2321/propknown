import type { NextRequest } from "next/server";

// Vercel (and most reverse proxies) set x-forwarded-for as "client, proxy1, proxy2..." --
// the first entry is the actual visitor. Falls back to x-real-ip, then null (never throws;
// callers must handle "IP unknown" by simply skipping the IP-based check).
export function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}
