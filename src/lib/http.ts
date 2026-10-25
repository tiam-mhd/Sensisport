import { NextResponse } from "next/server";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}

export function requestIp(request: Request) {
  return request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function readJson(request: Request, maxBytes = 32 * 1024) {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > maxBytes) return { ok: false as const, status: 413, value: null };
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > maxBytes) return { ok: false as const, status: 413, value: null };
  try { return { ok: true as const, status: 200, value: JSON.parse(raw) as unknown }; }
  catch { return { ok: false as const, status: 400, value: null }; }
}

export function errorMessage(locale: string, key: "invalid" | "unauthorized" | "forbidden" | "unavailable") {
  const fa = locale === "fa";
  if (key === "invalid") return fa ? "اطلاعات واردشده معتبر نیست." : "The submitted information is invalid.";
  if (key === "unauthorized") return fa ? "برای ادامه وارد حساب شوید." : "Please sign in to continue.";
  if (key === "forbidden") return fa ? "دسترسی لازم را ندارید." : "You do not have permission to do that.";
  return fa ? "این قابلیت هنوز پیکربندی نشده است." : "This feature has not been configured yet.";
}
