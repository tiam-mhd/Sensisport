import "server-only";
import { createHash } from "node:crypto";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";

export function hashIp(ip: string | null) {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

export async function writeAuditLog(input: {
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ip?: string | null;
}) {
  await getDb().insert(auditLogs).values({
    actorId: input.actorId ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    details: input.details ?? {},
    ipHash: hashIp(input.ip ?? null),
  });
}
