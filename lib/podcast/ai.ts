import { recordApiCall } from "@/lib/engine/usage";
import { geminiJson } from "@/lib/ai/gemini";

// Podcast AI (Task I): transcript + draft title, show notes, chapters and SEO description from
// the owner's own recorded MP3 (Gemini audio understanding via the Files API), and marketing
// drafts on publish. Everything produced here is a DRAFT the owner edits before publishing; the
// prompts forbid adding facts that weren't said in the episode.

const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

async function uploadToGemini(audio: ArrayBuffer, mime: string, apiKey: string): Promise<string> {
  const start = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(audio.byteLength), "X-Goog-Upload-Header-Content-Type": mime,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: "propknown-episode" } }),
  });
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!start.ok || !uploadUrl) throw new Error(`Gemini file upload start failed (${start.status})`);
  const done = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Length": String(audio.byteLength), "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" },
    body: audio,
  });
  const info = await done.json() as { file?: { uri?: string; name?: string; state?: string } };
  if (!done.ok || !info.file?.uri) throw new Error(`Gemini file upload failed (${done.status})`);
  // Wait until the file is processed (ACTIVE).
  for (let i = 0; i < 30 && info.file.state !== "ACTIVE"; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const s = await fetch(`https://generativelanguage.googleapis.com/v1beta/${info.file.name}?key=${apiKey}`).then((r) => r.json()).catch(() => null) as { state?: string } | null;
    if (s?.state) info.file.state = s.state;
    if (s?.state === "FAILED") throw new Error("Gemini could not process the audio file");
  }
  return info.file.uri;
}

export interface EpisodeDraft {
  title: string; description: string; showNotes: string;
  chapters: { start: string; title: string }[]; transcript: string; topic: string | null; guest: string | null;
}

export async function draftFromAudio(audioUrl: string): Promise<EpisodeDraft> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) throw new Error(`Couldn't read the uploaded audio (${audioRes.status})`);
  const mime = audioRes.headers.get("content-type") || "audio/mpeg";
  const fileUri = await uploadToGemini(await audioRes.arrayBuffer(), mime, apiKey);

  const prompt = `This is an episode of "The PropKnown Podcast" (Indian real estate, host Pinnelli Raghukiran).
Return JSON:
{"transcript": full verbatim transcript with [mm:ss] timestamps at each speaker turn and "Speaker:" labels,
 "title": an accurate episode title (max 80 chars),
 "description": SEO description, max 155 chars,
 "showNotes": 3-5 short paragraphs summarising ONLY what was said,
 "chapters": [{"start":"mm:ss","title"}] at real topic changes,
 "topic": main topic, "guest": guest name if one is introduced, else null}
Use only what is actually said in the audio. Do not add facts, numbers or claims that are not spoken.`;

  let lastErr = "";
  for (const model of MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ fileData: { mimeType: mime, fileUri } }, { text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json", maxOutputTokens: 60000, thinkingConfig: { thinkingBudget: 0 } },
      }),
      signal: AbortSignal.timeout(240_000),
    }).catch((e) => { recordApiCall("gemini", "error"); throw e; });
    recordApiCall("gemini", res.ok ? "ok" : res.status === 429 ? "rate_limited" : "error");
    const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[]; error?: { message?: string } };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
    if (res.ok && text) {
      const d = JSON.parse(text) as EpisodeDraft;
      return {
        title: String(d.title ?? "").slice(0, 120), description: String(d.description ?? "").slice(0, 200),
        showNotes: String(d.showNotes ?? ""), transcript: String(d.transcript ?? ""),
        chapters: Array.isArray(d.chapters) ? d.chapters.filter((c) => c?.start && c?.title).slice(0, 30) : [],
        topic: d.topic ?? null, guest: d.guest ?? null,
      };
    }
    lastErr = `${model} ${res.status}: ${data.error?.message ?? "empty response"}`;
    if (![404, 429, 503].includes(res.status)) break;
  }
  throw new Error(lastErr);
}

export async function marketingDrafts(ep: { title: string; description: string; showNotes: string | null; slug: string }) {
  const url = `https://www.propknown.com/podcast/${ep.slug}`;
  return geminiJson<{ instagram: string; linkedin: string; reelScript: string; whatsapp: string }>(`Draft marketing for this PropKnown podcast episode. Use only what the title, description and notes say; no new facts or numbers.
Title: ${ep.title}
Description: ${ep.description}
Notes: ${(ep.showNotes ?? "").slice(0, 3000)}
Return JSON {"instagram" (max 60 words, 3 hashtags), "linkedin" (max 90 words), "reelScript" (a 30-second script: hook, 3 beats, call to action, with rough timings), "whatsapp" (broadcast message, max 50 words)}. Include ${url} in instagram, linkedin and whatsapp.`, { timeoutMs: 40_000, temperature: 0.5 });
}
