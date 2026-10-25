import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, siteSettings } from "@/db/schema";
import { requireAdminUser } from "@/lib/auth/authorize";
import { jsonError, readJson, sameOrigin } from "@/lib/http";

const contentSchema = z.object({ shippingFa: z.string().max(5000), shippingEn: z.string().max(5000), warrantyFa: z.string().max(5000), warrantyEn: z.string().max(5000), faqFa: z.string().max(5000), faqEn: z.string().max(5000), contactFa: z.string().max(2000), contactEn: z.string().max(2000) });

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const rows = await getDb().select().from(siteSettings);
  return Response.json({ settings: Object.fromEntries(rows.map((row) => [row.key, row.value])) }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const payload = await readJson(request, 24_000);
  if (!payload.ok) return jsonError("Invalid request.", payload.status);
  const parsed = contentSchema.safeParse(payload.value);
  if (!parsed.success) return jsonError("Review the content fields.", 400);
  const groups: Record<string, { fa: string; en: string }> = {
    "service.shipping": { fa: parsed.data.shippingFa, en: parsed.data.shippingEn },
    "service.warranty": { fa: parsed.data.warrantyFa, en: parsed.data.warrantyEn },
    "service.faq": { fa: parsed.data.faqFa, en: parsed.data.faqEn },
    contact: { fa: parsed.data.contactFa, en: parsed.data.contactEn },
  };
  const db = getDb();
  await db.transaction(async (tx) => {
    for (const [key, value] of Object.entries(groups)) await tx.insert(siteSettings).values({ key, value, updatedBy: admin.id, updatedAt: new Date() }).onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedBy: admin.id, updatedAt: new Date() } });
    await tx.insert(auditLogs).values({ actorId: admin.id, action: "site_settings.updated", entityType: "site_settings", details: { keys: Object.keys(groups) }, ipHash: null });
  });
  return Response.json({ ok: true });
}
