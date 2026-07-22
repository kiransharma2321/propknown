import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, canRole } from "@/lib/rbac";
import { saveCredential, listCredentialViews, getCredentialFields, setCredentialStatus } from "@/lib/apiCredentials";

// Settings -> API Keys (Section 15 / Section D). Gated on the new "settings" permission --
// master (via "all") and the new C-suite/COO roles can reach this; manager/agent's existing
// permission sets are untouched, so they correctly do NOT gain access to credential storage.
async function requireSettingsAccess() {
  const session = await getAdminSession();
  if (!session || !canRole(session.role, "settings")) return null;
  return session;
}

export async function GET() {
  if (!(await requireSettingsAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const views = await listCredentialViews();
  return NextResponse.json({ credentials: views });
}

export async function POST(req: NextRequest) {
  const session = await requireSettingsAccess();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { provider, fields } = await req.json() as { provider?: string; fields?: Record<string, string> };
  if (!provider || !fields || Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "provider and fields are required" }, { status: 400 });
  }
  if (!["meta", "google_ads", "youtube"].includes(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  await saveCredential(provider, fields);
  return NextResponse.json({ ok: true });
}

// Test the saved credential against the real provider API -- for Meta, confirms the Page
// Access Token actually works by calling the Graph API for real (this is the live check the
// plan called for, before wiring the webhook to depend on it).
export async function PATCH(req: NextRequest) {
  const session = await requireSettingsAccess();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { provider } = await req.json() as { provider?: string };
  if (provider !== "meta") {
    return NextResponse.json({ error: "Only the Meta connection can be tested right now" }, { status: 400 });
  }

  const fields = await getCredentialFields("meta");
  if (!fields?.pageAccessToken || !fields?.pageId) {
    return NextResponse.json({ error: "Save a Page Access Token and Page ID first" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${fields.pageId}?fields=id,name&access_token=${encodeURIComponent(fields.pageAccessToken)}`
    );
    const data = await res.json() as { id?: string; name?: string; error?: { message: string; type: string } };

    if (!res.ok || data.error) {
      await setCredentialStatus("meta", "error");
      return NextResponse.json({ ok: false, error: data.error?.message ?? `Graph API returned ${res.status}` }, { status: 200 });
    }

    await setCredentialStatus("meta", "connected");
    return NextResponse.json({ ok: true, pageName: data.name });
  } catch (e) {
    await setCredentialStatus("meta", "error");
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Request failed" }, { status: 200 });
  }
}
