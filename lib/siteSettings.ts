import { prisma } from "@/lib/db";

// Admin-editable site wording (Admin → Settings → Company profile). Falls back to safe defaults
// if the setting is empty or the column doesn't exist yet.
export const DEFAULT_CALLBACK_TEXT = "We'll call you back soon.";

export async function getCallbackText(): Promise<string> {
  const row = await prisma.companySettings
    .findUnique({ where: { id: "singleton" }, select: { callbackText: true } })
    .catch(() => null);
  return row?.callbackText?.trim() || DEFAULT_CALLBACK_TEXT;
}
