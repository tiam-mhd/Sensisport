import { readProductImage } from "@/lib/storage/s3";

export async function GET(_request: Request, { params }: RouteContext<"/api/media/[...key]">) {
  const { key } = await params;
  try {
    const image = await readProductImage(key.join("/"));
    if (!image) return new Response(null, { status: 404 });
    return new Response(image.body, { headers: { "content-type": image.contentType, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
