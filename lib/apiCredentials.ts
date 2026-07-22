import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from "crypto";
import { prisma } from "@/lib/db";

// Encrypted-at-rest storage for third-party API credentials (Meta, Google Ads, YouTube --
// Section 15/Section D). AES-256-GCM, keyed from NEXTAUTH_SECRET (already a private,
// server-only secret in this project -- see lib/rbac.ts's own comment on the previous
// SHA-256+static-salt password scheme for why a real KDF matters here, not the raw string).
// Once saved, the plaintext value is never returned by any API route -- callers get a masked
// placeholder for display and can only get the real decrypted value server-side, for the
// specific purpose of calling the provider's API (e.g. the Meta Graph API call in
// app/api/leads/inbound/route.ts).

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set -- required to encrypt/decrypt API credentials");
  return scryptSync(secret, "propknown-api-credentials", 32);
}

export function encryptCredential(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // ivHex:authTagHex:encryptedHex -- all needed to decrypt, none of it useful without the key.
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptCredential(stored: string): string {
  const [ivHex, authTagHex, dataHex] = stored.split(":");
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}

// Masked value for display in the Settings UI after save -- shows enough to confirm "yes,
// something is saved" without exposing the credential. Never send decryptCredential()'s output
// to a client-facing response.
export function maskForDisplay(plaintext: string): string {
  if (plaintext.length <= 8) return "••••••••";
  return `${plaintext.slice(0, 4)}${"•".repeat(Math.min(plaintext.length - 8, 20))}${plaintext.slice(-4)}`;
}

export interface StoredCredentialView {
  provider: string;
  status: string;
  lastTestedAt: Date | null;
  updatedAt: Date;
  configured: boolean;
}

// Multi-field credentials (Meta needs pageAccessToken + appSecret + pageId together) are stored
// as one encrypted JSON blob per provider row, not one row per field.
export async function saveCredential(provider: string, fields: Record<string, string>): Promise<void> {
  const encryptedValue = encryptCredential(JSON.stringify(fields));
  await prisma.apiCredential.upsert({
    where: { provider },
    create: { provider, encryptedValue, status: "not_connected" },
    update: { encryptedValue, status: "not_connected" },
  });
}

export async function getCredentialFields(provider: string): Promise<Record<string, string> | null> {
  const row = await prisma.apiCredential.findUnique({ where: { provider } });
  if (!row) return null;
  try {
    return JSON.parse(decryptCredential(row.encryptedValue)) as Record<string, string>;
  } catch {
    return null;
  }
}

export async function setCredentialStatus(provider: string, status: "connected" | "error" | "not_connected"): Promise<void> {
  await prisma.apiCredential.update({
    where: { provider },
    data: { status, lastTestedAt: new Date() },
  });
}

export async function listCredentialViews(): Promise<StoredCredentialView[]> {
  const rows = await prisma.apiCredential.findMany();
  return rows.map(r => ({
    provider: r.provider, status: r.status, lastTestedAt: r.lastTestedAt, updatedAt: r.updatedAt, configured: true,
  }));
}
