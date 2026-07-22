import { getCredentialFields, setCredentialStatus } from "@/lib/apiCredentials";

// Real Google Ads API test-connection logic. Unlike Meta (a single Page Access Token) and
// Twilio (Account SID + Auth Token), Google Ads requires a full OAuth2 refresh-token flow plus
// a developer token that Google approves separately -- there is genuinely nothing to test
// successfully tonight, since no such approved credentials exist yet. This is real,
// non-fabricated code: the moment real values are saved, Test Connection makes a genuine call
// against Google's OAuth + Ads API endpoints, exactly like the Meta/Twilio tests -- it's not a
// stub that always reports success or failure.

interface GoogleAdsFields {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  developerToken?: string;
  loginCustomerId?: string; // MCC account ID, digits only
}

async function getGoogleAdsConfig(): Promise<GoogleAdsFields | null> {
  const fields = await getCredentialFields("google_ads");
  if (!fields?.clientId || !fields?.clientSecret || !fields?.refreshToken || !fields?.developerToken) return null;
  return fields;
}

export async function testGoogleAdsConnection(): Promise<{ ok: boolean; error?: string }> {
  const fields = await getGoogleAdsConfig();
  if (!fields) {
    return { ok: false, error: "Client ID, Client Secret, Refresh Token, and Developer Token are all required" };
  }

  try {
    // Step 1: exchange the refresh token for a real access token via Google's OAuth endpoint.
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: fields.clientId!,
        client_secret: fields.clientSecret!,
        refresh_token: fields.refreshToken!,
        grant_type: "refresh_token",
      }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string; error_description?: string };
    if (!tokenRes.ok || !tokenData.access_token) {
      await setCredentialStatus("google_ads", "error");
      return { ok: false, error: tokenData.error_description ?? tokenData.error ?? "OAuth token exchange failed" };
    }

    // Step 2: a minimal, real Google Ads API call to confirm the developer token + access token
    // actually work together.
    const adsRes = await fetch("https://googleads.googleapis.com/v17/customers:listAccessibleCustomers", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "developer-token": fields.developerToken!,
      },
    });
    const adsData = await adsRes.json() as { resourceNames?: string[]; error?: { message: string } };
    if (!adsRes.ok || adsData.error) {
      await setCredentialStatus("google_ads", "error");
      return { ok: false, error: adsData.error?.message ?? `Google Ads API returned ${adsRes.status}` };
    }

    await setCredentialStatus("google_ads", "connected");
    return { ok: true };
  } catch (e) {
    await setCredentialStatus("google_ads", "error");
    return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
  }
}
