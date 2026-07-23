import { prisma } from "@/lib/db";

// Audit Trail (Section 14), scoped to new Enterprise CRM mutations only -- Settings/credential
// changes, AI scoring runs, and new admin user/role creation. Deliberately NOT wired into every
// pre-existing route tonight (see the plan for why: real regression risk touching working code
// for a feature that's only trustworthy if it's complete, which a partial retrofit wouldn't be).
// Fire-and-forget, same pattern as lib/notifications.ts -- an audit-log failure must never break
// the action it's logging.
export async function logAudit(opts: {
  actorId?: string; actorName?: string; action: string; entity?: string; entityId?: string; details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: opts.actorId, actorName: opts.actorName, action: opts.action,
        entity: opts.entity, entityId: opts.entityId,
        details: opts.details ? JSON.parse(JSON.stringify(opts.details)) : undefined,
      },
    });
  } catch (e) {
    console.error("logAudit failed", e);
  }
}
