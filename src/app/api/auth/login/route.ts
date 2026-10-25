import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { writeAuditLog } from "@/lib/auth/audit";
import { allowLoginAttempt } from "@/lib/auth/rate-limit";
import { issueSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { jsonError, readJson, requestIp, sameOrigin } from "@/lib/http";
import { emailSchema, passwordSchema } from "@/lib/validation";

const bodySchema = z.object({ email: emailSchema, password: passwordSchema });
const fakeHash = `scrypt$0123456789abcdef0123456789abcdef$${"0".repeat(128)}`;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  const input = await readJson(request, 8_000);
  if (!input.ok) return jsonError("Invalid request.", input.status);
  const parsed = bodySchema.safeParse(input.value);
  if (!parsed.success) return jsonError("Invalid email or password.", 400);
  const ip = requestIp(request);
  if (!(await allowLoginAttempt(parsed.data.email, ip))) return jsonError("Too many attempts. Try again later.", 429);
  const [user] = await getDb().select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  const passwordMatches = await verifyPassword(parsed.data.password, user?.passwordHash ?? fakeHash);
  if (!user || user.disabledAt || !passwordMatches) {
    await writeAuditLog({ actorId: null, action: "auth.login_failed", entityType: "user", details: {}, ip });
    return jsonError("Invalid email or password.", 401);
  }
  await issueSession(user.id);
  await writeAuditLog({ actorId: user.id, action: "auth.login_succeeded", entityType: "user", entityId: user.id, details: {}, ip });
  return Response.json({ id: user.id, email: user.email, name: user.name, role: user.role }, { headers: { "cache-control": "no-store" } });
}
