import { clearSession } from "@/lib/auth/session";
import { jsonError, sameOrigin } from "@/lib/http";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  await clearSession();
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
