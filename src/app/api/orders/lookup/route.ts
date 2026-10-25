import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { createOrderLookupToken } from "@/lib/auth/order-lookup";
import { jsonError, readJson, sameOrigin } from "@/lib/http";
import { emailSchema, localeSchema } from "@/lib/validation";

const lookupSchema = z.object({
  locale: localeSchema,
  publicId: z.string().regex(/^[a-f0-9]{40}$/i),
  email: emailSchema,
});

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  const jsonRequest = request.headers.get("content-type")?.includes("application/json") ?? false;
  let raw: unknown;
  if (jsonRequest) {
    const input = await readJson(request, 4_000);
    if (!input.ok) return jsonError("Invalid request.", input.status);
    raw = input.value;
  } else {
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > 4_000) return jsonError("Invalid request.", 413);
    raw = Object.fromEntries(new URLSearchParams(body).entries());
  }
  const parsed = lookupSchema.safeParse(raw);
  if (!parsed.success) return jsonError("Enter the email used for this order.", 400);
  const { locale, publicId, email } = parsed.data;
  const [order] = await getDb().select({ publicId: orders.publicId }).from(orders).where(and(eq(orders.publicId, publicId), eq(orders.email, email))).limit(1);
  if (!order) {
    if (jsonRequest) return jsonError("No order matched those details.", 404);
    return NextResponse.redirect(new URL(`/${locale}/order/${publicId}?lookup=failed`, request.url), 303);
  }
  const token = await createOrderLookupToken(publicId);
  const response = jsonRequest
    ? NextResponse.json({ url: `/${locale}/order/${publicId}` }, { headers: { "cache-control": "no-store" } })
    : NextResponse.redirect(new URL(`/${locale}/order/${publicId}`, request.url), 303);
  response.cookies.set("sensi_order_lookup", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/${locale}/order/${publicId}`,
    maxAge: 15 * 60,
  });
  return response;
}
