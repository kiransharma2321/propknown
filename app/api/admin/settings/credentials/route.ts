import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, canRole } from "@/lib/rbac";
import { saveCredential, listCredentialViews, getCredentialFields, setCredentialStatus } from "@/lib/apiCredentials";
import { testTwilioConnection } from "@/lib/twilio";
import { testGoogleAdsConnection } from "@/lib/googleAds";
import { logAudit } from "@/lib/auditLog";

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
  if (!["meta", "google_ads", "youtube", "twilio"].includes(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  await saveCredential(provider, fields);
  // Note what changed, never the credential values themselves.
  logAudit({ actorId: session.userId, actorName: session.name, action: "credentials.save", entity: "ApiCredential", entityId: provider }).catch(() => null);
  return NextResponse.json({ ok: true });
}

// Test the saved credential against the real provider API. Every branch here makes a genuine
// live call -- none of these can report "connected" without the provider's own API actually
// confirming it. This is what makes "once you save real credentials it must actually work" true:
// there's no separate code path for demo/success vs real -- Test Connection IS the real usage.
export async function PATCH(req: NextRequest) {
  const session = await requireSettingsAccess();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { provider } = await req.json() as { provider?: string };

  if (provider === "meta") {
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
        return NextResponse.json({ ok: false, error: data.error?.message ?? `Graph API returned ${res.status}` });
      }
      await setCredentialStatus("meta", "connected");
      return NextResponse.json({ ok: true, pageName: data.name });
    } catch (e) {
      await setCredentialStatus("meta", "error");
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Request failed" });
    }
  }

  if (provider === "twilio") {
    const result = await testTwilioConnection();
    return NextResponse.json(result);
  }

  if (provider === "google_ads") {
    const result = await testGoogleAdsConnection();
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Unknown or untestable provider" }, { status: 400 });
}
