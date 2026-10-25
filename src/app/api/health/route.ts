export async function GET() {
  return Response.json({ status: "ok", service: "sensi-sport-web" }, { headers: { "cache-control": "no-store" } });
}
