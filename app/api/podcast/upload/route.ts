import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { masterApiSession } from "@/lib/adminGuard";

// Issues short-lived client-upload tokens for Podcast Studio: the browser uploads the MP3 (or
// cover art) straight to the propknown-media Blob store, so large files never pass through a
// serverless function. Master admin only.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body, request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await masterApiSession())) throw new Error("Only the master admin can upload.");
        const isCover = pathname.startsWith("podcast/cover");
        return {
          allowedContentTypes: isCover ? ["image/jpeg", "image/png"] : ["audio/mpeg", "audio/mp3", "audio/x-m4a", "audio/mp4"],
          maximumSizeInBytes: isCover ? 5 * 1024 * 1024 : 300 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      // The Studio saves the URL itself right after upload, so nothing to do here.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
