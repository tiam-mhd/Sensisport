import { checkDatabase } from "@/db";

export async function GET() {
  try {
    if (!(await checkDatabase())) return Response.json({ status: "not_ready", database: "not_configured" }, { status: 503, headers: { "cache-control": "no-store" } });
    return Response.json({ status: "ready", database: "ok" }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ status: "not_ready", database: "unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
