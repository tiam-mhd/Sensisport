import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "content/instagram-source/data");
const readJson = async (name) => JSON.parse(await readFile(path.join(sourceDir, name), "utf8"));

const [profile, postPack, productPack, highlightPack, assetManifest, copyPack] = await Promise.all([
  readJson("profile.json"),
  readJson("posts.json"),
  readJson("products_seed.json"),
  readJson("highlights.json"),
  readJson("asset_manifest.json"),
  readFile(path.join(root, "content/instagram-source/product-copy.json"), "utf8").then(JSON.parse),
]);

const productsBySource = new Map();
for (const product of productPack.items) {
  for (const sourceId of product.post_ids) {
    const ids = productsBySource.get(sourceId) ?? [];
    ids.push(product.id);
    productsBySource.set(sourceId, ids);
  }
}

const postImage = (post) => `/images/instagram/posts/${path.posix.basename(post.local_asset)}`;
const highlightImage = (highlight) => `/images/instagram/highlights/${path.posix.basename(highlight.cover_image)}`;
const postById = new Map(postPack.items.map((post) => [post.id, post]));
const copyById = new Map(copyPack.items.map((item) => [item.id, item]));

const products = productPack.items.map((product) => {
  const siteCopy = copyById.get(product.id);
  const category = copyPack.categories[product.category_fa];
  if (!siteCopy || !category) throw new Error(`Missing site copy or category for ${product.id}.`);
  const primaryPost = postById.get(product.post_ids[0]);
  if (!primaryPost) throw new Error(`Missing source post for ${product.id}.`);
  return {
    ...product,
    slug: siteCopy.slug,
    featured: siteCopy.featured,
    confidence: siteCopy.confidence,
    review_status: "seller_confirmation_pending",
    category_slug: category.slug,
    category_en: category.name_en,
    description_fa: siteCopy.description_fa,
    description_en: siteCopy.description_en,
    specifications_fa: siteCopy.specifications_fa,
    specifications_en: siteCopy.specifications_en,
    source_url: primaryPost.source_url,
    shortcode: primaryPost.id,
    post_date: primaryPost.published_date,
    caption_excerpt: primaryPost.caption_fa?.replace(/\s+/g, " ").trim().slice(0, 360) ?? "",
    source_image_path: primaryPost.local_asset,
    site_image_path: postImage(primaryPost),
    source_urls: product.post_ids.map((id) => postById.get(id)?.source_url).filter(Boolean),
  };
});

const posts = postPack.items.map((post) => ({
  ...post,
  site_image_path: postImage(post),
  product_ids: productsBySource.get(post.id) ?? [],
}));

const highlights = highlightPack.highlights.map((highlight) => ({
  ...highlight,
  site_cover_path: highlightImage(highlight),
}));

const mediaCounts = Object.fromEntries(
  Object.entries(Object.groupBy(posts, (post) => post.media_type)).map(([kind, items]) => [kind, items.length]),
);

const audit = {
  schema_version: "2.0",
  source_url: profile.source_url,
  capture_date: profile.capture_date,
  scope: {
    public_feed_items_observed: posts.length,
    media_counts: mediaCounts,
    captions_missing: posts.filter((post) => post.caption_status !== "available").length,
    reel_videos_downloaded: posts.filter((post) => post.kind === "reel" && post.video_file_status === "downloaded").length,
    highlight_count: highlights.length,
    highlight_frames_available: highlights.filter((item) => item.story_frames_available).length,
    note_fa: postPack.scope_note_fa,
    highlight_note_fa: "عنوان و کاور ۱۰ هایلایت ثبت شده؛ محتوای فریم‌ها در نشست عمومی پشت درخواست ورود باقی ماند.",
  },
  profile,
  contact: {
    ...copyPack.contact,
    phone_source_url: postById.get(copyPack.contact.phone_source_post_id)?.source_url ?? null,
    phone_source_note_fa: "شماره روی تصویر یک پست عمومی مورخ ۲۰۲۶-۱۰-۲۰ دیده می‌شود؛ راه تماس جاری دیگری از آمار قدیمی حساب برداشت نشده است.",
  },
  products,
  posts,
  highlights,
  assets: assetManifest,
};

const csvColumns = [
  "source_url", "shortcode", "post_date", "caption_excerpt", "product_name", "category", "variants",
  "price_source", "price_status", "source_image_path", "site_image_path", "confidence", "review_status",
];
const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const csv = [csvColumns.join(","), ...products.map((product) => {
  const values = {
    ...product,
    variants: JSON.stringify(product.variants_fa ?? []),
    price_source: product.source_price_text,
  };
  return csvColumns.map((column) => csvCell(values[column])).join(",");
})].join("\n") + "\n";

await Promise.all([
  writeFile(path.join(root, "content/instagram-source-audit.json"), `${JSON.stringify(audit, null, 2)}\n`, "utf8"),
  writeFile(path.join(root, "content/instagram-source-audit.csv"), csv, "utf8"),
]);

console.info(`Wrote audit for ${posts.length} posts, ${products.length} products, ${highlights.length} highlights, and ${assetManifest.assets.length} source assets.`);
