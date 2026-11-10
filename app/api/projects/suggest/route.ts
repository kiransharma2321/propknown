import { NextRequest, NextResponse } from "next/server";
import { suggestProjects } from "@/lib/projects";

export const dynamic = "force-dynamic";

// Project name autocomplete (Price Reality Check, AI Intel): "Project · Builder · Area".
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json({ suggestions: await suggestProjects(q) });
}
