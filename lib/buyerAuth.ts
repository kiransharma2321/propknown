import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/rbac";

export { hashPassword };

export async function getBuyerSession(): Promise<{ id: string; name: string; email: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("buyer_auth")?.value;
    if (!token) return null;

    const [buyerId] = token.split(":");
    const buyer = await prisma.buyerUser.findUnique({
      where: { id: buyerId },
      select: { id: true, name: true, email: true },
    });
    return buyer;
  } catch {
    return null;
  }
}
