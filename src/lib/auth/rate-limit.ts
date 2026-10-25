import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { rateLimits } from "@/db/schema";

function hashedKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function allowLoginAttempt(email: string, ip: string) {
  const keys = [hashedKey(`email:${email}`), hashedKey(`ip:${ip}`)];
  const db = getDb();
  const now = new Date();
  const windowStart = new Date(now.getTime() - 15 * 60 * 1000);
  const rows = await Promise.all(keys.map(async (key) => {
    const [row] = await db.insert(rateLimits).values({ key, attempts: 1, windowStartedAt: now, updatedAt: now }).onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        attempts: sql`case when ${rateLimits.windowStartedAt} <= ${windowStart} then 1 else ${rateLimits.attempts} + 1 end`,
        windowStartedAt: sql`case when ${rateLimits.windowStartedAt} <= ${windowStart} then ${now} else ${rateLimits.windowStartedAt} end`,
        updatedAt: now,
      },
    }).returning({ attempts: rateLimits.attempts });
    return row?.attempts ?? Number.POSITIVE_INFINITY;
  }));
  return rows.every((attempts) => attempts <= 5);
}
