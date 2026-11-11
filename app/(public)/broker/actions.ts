"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { FEATURES } from "@/lib/features";
import { hashPassword } from "@/lib/buyerAuth";
import { BROKER_COOKIE, brokerCookieOptions, createBrokerToken, getBrokerSession } from "@/lib/brokers/auth";
import { rowsFromCsv, sqftOf, OWNERSHIP_DECLARATION } from "@/lib/brokers/csv";
import { CHECKLIST_ITEMS } from "@/lib/listings/checklist";
import { createNotification } from "@/lib/notifications";

// Broker / channel-partner portal (flag NEXT_PUBLIC_FEATURE_LISTING_RESEARCHER).
export interface BrokerState { ok: boolean; message: string }
const off: BrokerState = { ok: false, message: "The broker portal isn't open yet." };
const s = (f: FormData, k: string, n = 200) => String(f.get(k) ?? "").trim().slice(0, n);

export async function signupAction(_p: BrokerState, f: FormData): Promise<BrokerState> {
  if (!FEATURES.listingResearcher) return off;
  const email = s(f, "email").toLowerCase(), password = String(f.get("password") ?? "");
  if (!s(f, "name") || !/^\S+@\S+\.\S+$/.test(email) || s(f, "phone").replace(/\D/g, "").length < 10) return { ok: false, message: "Name, a valid email and phone are required." };
  if (password.length < 10) return { ok: false, message: "Use a password of at least 10 characters." };
  if (await prisma.broker.findUnique({ where: { email } })) return { ok: false, message: "An account with this email already exists. Log in instead." };
  await prisma.broker.create({ data: { name: s(f, "name"), firm: s(f, "firm") || null, email, phone: s(f, "phone", 20), reraAgentNo: s(f, "reraAgentNo", 60) || null, passwordHash: await hashPassword(password) } });
  await createNotification({ type: "broker_signup", title: `Broker sign-up: ${s(f, "name")}`, body: `${s(f, "firm") || "-"} · ${email}`, link: "/admin/automation/brokers" });
  return { ok: true, message: "Thanks. Your account is waiting for approval by PropKnown. You can log in now; uploads open once you're approved." };
}

export async function loginAction(_p: BrokerState, f: FormData): Promise<BrokerState> {
  if (!FEATURES.listingResearcher) return off;
  const b = await prisma.broker.findUnique({ where: { email: s(f, "email").toLowerCase() } });
  const ok = b && b.status !== "suspended" && (await bcrypt.compare(String(f.get("password") ?? ""), b.passwordHash));
  if (!b || !ok) return { ok: false, message: "Invalid email or password." };
  const token = createBrokerToken(b);
  if (!token) return { ok: false, message: "Login is temporarily unavailable." };
  (await cookies()).set(BROKER_COOKIE, token, brokerCookieOptions);
  revalidatePath("/broker");
  return { ok: true, message: "Logged in." };
}

export async function logoutAction() {
  (await cookies()).set(BROKER_COOKIE, "", { ...brokerCookieOptions, maxAge: 0 });
  revalidatePath("/broker");
}

// CSV upload -> one Approval Queue draft per valid row, each carrying the broker's ownership /
// authorisation declaration (text, time, IP). Nothing is published until PropKnown approves it.
export async function uploadAction(_p: BrokerState, f: FormData): Promise<BrokerState> {
  if (!FEATURES.listingResearcher) return off;
  const b = await getBrokerSession();
  if (!b) return { ok: false, message: "Please log in again." };
  if (b.status !== "approved") return { ok: false, message: "Your account is waiting for approval. Uploads open once PropKnown approves it." };
  if (f.get("declaration") !== "on") return { ok: false, message: "Tick the ownership / authorisation declaration to upload." };
  const file = f.get("file");
  if (!(file instanceof File) || !file.size) return { ok: false, message: "Choose a CSV file." };
  if (file.size > 1_000_000) return { ok: false, message: "CSV must be under 1 MB." };
  const { rows, errors } = rowsFromCsv(await file.text());
  if (!rows.length) return { ok: false, message: errors.join(" ") || "No valid rows found." };
  const declaration = { text: OWNERSHIP_DECLARATION, at: new Date().toISOString(), ip: (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, brokerId: b.id, file: file.name.slice(0, 120) } as Prisma.InputJsonValue;
  let created = 0;
  for (const r of rows) {
    const rera = r.approvalType === "RERA" && r.approvalNumber ? r.approvalNumber : null;
    try {
      await prisma.listingDraft.create({ data: {
        origin: "broker_csv", brokerId: b.id, ownershipDeclaration: declaration, sourceName: `Broker: ${b.firm ?? b.name}`,
        projectName: r.title, location: r.locality, city: r.city, propertyType: r.propertyType,
        configuration: r.bhk, sizeText: r.size ? `${r.size} ${r.sizeUnit}` : null, sizeSqft: sqftOf(r),
        reraNumber: rera, approvalAuthority: r.approvalNumber && !rera ? r.approvalType ?? "Other" : null, approvalNumber: r.approvalNumber && !rera ? r.approvalNumber : null,
        price: r.price, priceSourceDate: r.price ? new Date() : null, priceNote: r.price ? `Asking price stated by broker ${b.firm ?? b.name}` : null,
        description: r.description, checklist: CHECKLIST_ITEMS.map(() => false),
      } });
      created++;
    } catch (e) {
      errors.push((e as { code?: string }).code === "P2002" ? `${r.title}: RERA ${rera} is already in the queue.` : `${r.title}: could not be saved.`);
    }
  }
  await createNotification({ type: "broker_upload", title: `Broker upload: ${created} listing(s)`, body: `${b.firm ?? b.name}`, link: "/admin/approval-queue?origin=broker_csv" });
  return { ok: true, message: `${created} listing(s) sent to PropKnown for review.${errors.length ? ` Skipped: ${errors.slice(0, 8).join(" ")}` : ""}` };
}
