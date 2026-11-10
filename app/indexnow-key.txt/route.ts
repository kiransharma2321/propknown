// IndexNow key file (keyLocation for pings sent when a news post is published).
export function GET() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return new Response("Not found", { status: 404 });
  return new Response(key, { headers: { "Content-Type": "text/plain" } });
}
