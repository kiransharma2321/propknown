import { getCredentialFields, setCredentialStatus } from "@/lib/apiCredentials";

// Real Twilio REST API calls -- hand-rolled fetch, no SDK dependency, matching this codebase's
// existing convention (Gemini is called the same way in lib/marketIntel.ts / app/api/jarvis).
// Nothing here is a stub: sendSms/sendWhatsApp make genuine Twilio API calls the moment real
// credentials are saved in Settings -> Integrations. Follow-Up Management (app/crm/followups)
// calls into these directly -- there's no separate "activate" step once credentials exist.

interface TwilioFields {
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;         // SMS sender, e.g. "+1415XXXXXXX"
  whatsappFromNumber?: string; // WhatsApp sender, e.g. "+1415XXXXXXX" (Twilio-approved WhatsApp sender)
}

export interface SendResult { ok: boolean; sid?: string; error?: string; }

async function getTwilioConfig(): Promise<TwilioFields | null> {
  const fields = await getCredentialFields("twilio");
  if (!fields?.accountSid || !fields?.authToken) return null;
  return fields;
}

// Validates the AccountSid/AuthToken pair against Twilio's own API without sending anything --
// the real "Test Connection" check, same shape as the Meta Graph API test in the credentials route.
export async function testTwilioConnection(): Promise<{ ok: boolean; accountName?: string; error?: string }> {
  const fields = await getTwilioConfig();
  if (!fields) return { ok: false, error: "Account SID and Auth Token are required" };

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${fields.accountSid}.json`, {
      headers: { Authorization: "Basic " + Buffer.from(`${fields.accountSid}:${fields.authToken}`).toString("base64") },
    });
    const data = await res.json() as { friendly_name?: string; message?: string };
    if (!res.ok) {
      await setCredentialStatus("twilio", "error");
      return { ok: false, error: data.message ?? `Twilio returned ${res.status}` };
    }
    await setCredentialStatus("twilio", "connected");
    return { ok: true, accountName: data.friendly_name };
  } catch (e) {
    await setCredentialStatus("twilio", "error");
    return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
  }
}

async function sendMessage(to: string, from: string, body: string): Promise<SendResult> {
  const fields = await getTwilioConfig();
  if (!fields) return { ok: false, error: "not_configured" };

  const params = new URLSearchParams({ To: to, From: from, Body: body });
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${fields.accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${fields.accountSid}:${fields.authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await res.json() as { sid?: string; message?: string };
    if (!res.ok) return { ok: false, error: data.message ?? `Twilio returned ${res.status}` };
    return { ok: true, sid: data.sid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
  }
}

export async function sendSms(to: string, body: string): Promise<SendResult> {
  const fields = await getTwilioConfig();
  if (!fields?.fromNumber) return { ok: false, error: "not_configured" };
  return sendMessage(to, fields.fromNumber, body);
}

export async function sendWhatsApp(to: string, body: string): Promise<SendResult> {
  const fields = await getTwilioConfig();
  if (!fields?.whatsappFromNumber) return { ok: false, error: "not_configured" };
  return sendMessage(`whatsapp:${to}`, `whatsapp:${fields.whatsappFromNumber}`, body);
}

export async function isTwilioConfigured(): Promise<boolean> {
  return (await getTwilioConfig()) !== null;
}
