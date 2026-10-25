import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { issueSession } from "@/lib/auth/session";
import { allowLoginAttempt } from "@/lib/auth/rate-limit";
import { jsonError, readJson, requestIp, sameOrigin } from "@/lib/http";
import { emailSchema, passwordSchema } from "@/lib/validation";
import { z } from "zod";

const bodySchema = z.object({ email: emailSchema, password: passwordSchema, name: z.string().trim().min(2).max(200) });

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  const input = await readJson(request, 8_000);
  if (!input.ok) return jsonError("Invalid request.", input.status);
  const parsed = bodySchema.safeParse(input.value);
  if (!parsed.success) return jsonError("Enter a valid name, email, and password of at least 10 characters.", 400);
  const ip = requestIp(request);
  if (!(await allowLoginAttempt(`register:${parsed.data.email}`, ip))) return jsonError("Too many attempts. Try again later.", 429);
  const passwordHash = await hashPassword(parsed.data.password);
  const [user] = await getDb().insert(users).values({ email: parsed.data.email, name: parsed.data.name, passwordHash, role: "customer" }).onConflictDoNothing({ target: users.email }).returning({ id: users.id, email: users.email, name: users.name, role: users.role });
  if (!user) return jsonError("An account with this email already exists.", 409);
  await issueSession(user.id);
  return Response.json(user, { status: 201, headers: { "cache-control": "no-store" } });
}
