import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL && existsSync(".env")) process.loadEnvFile(".env");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to import the Instagram source pack.");

const auditPath = path.join(process.cwd(), "content/instagram-source-audit.json");
const audit = JSON.parse(await readFile(auditPath, "utf8"));
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10_000 });
const client = await pool.connect();

const categoryByFa = new Map();
for (const product of audit.products) {
  if (!categoryByFa.has(product.category_fa)) {
    categoryByFa.set(product.category_fa, {
      slug: product.category_slug,
      nameFa: product.category_fa,
      nameEn: product.category_en,
    });
  }
}

const productsById = new Map();
const productsBySourceId = new Map();

try {
  await client.query("SELECT pg_advisory_lock($1, $2)", [1_954_017_221, 2]);
  await client.query("BEGIN");

  let categoryOrder = 0;
  for (const category of categoryByFa.values()) {
    await client.query(
      `INSERT INTO categories (slug, sort_order, active)
       VALUES ($1, $2, true)
       ON CONFLICT (slug) DO NOTHING`,
      [category.slug, categoryOrder++],
    );
    const result = await client.query("SELECT id FROM categories WHERE slug = $1", [category.slug]);
    const categoryId = result.rows[0]?.id;
    if (!categoryId) throw new Error(`Could not resolve category ${category.slug}.`);
    await client.query(
      `INSERT INTO category_translations (category_id, locale, name)
       VALUES ($1, 'fa', $2), ($1, 'en', $3)
       ON CONFLICT (category_id, locale) DO NOTHING`,
      [categoryId, category.nameFa, category.nameEn],
    );
    category.categoryId = categoryId;
  }

  for (const product of audit.products) {
    const category = categoryByFa.get(product.category_fa);
    const result = await client.query(
      `INSERT INTO products (
         category_id, slug, status, featured, price_status, price_minor, currency,
         track_inventory, stock, confidence, source_review_status
       ) VALUES ($1, $2, 'published', $3, 'quote', NULL, NULL, false, 0, $4, 'pending')
       ON CONFLICT (slug) DO NOTHING
       RETURNING id`,
      [category.categoryId, product.slug, product.featured, product.confidence],
    );
    const existing = result.rows[0] ?? (await client.query("SELECT id FROM products WHERE slug = $1", [product.slug])).rows[0];
    if (!existing?.id) throw new Error(`Could not resolve product ${product.slug}.`);
    const productId = existing.id;
    productsById.set(product.id, productId);

    await client.query(
      `INSERT INTO product_translations (product_id, locale, name, description, specifications)
       VALUES ($1, 'fa', $2, $3, $4::jsonb), ($1, 'en', $5, $6, $7::jsonb)
       ON CONFLICT (product_id, locale) DO NOTHING`,
      [
        productId, product.name_fa, product.description_fa, JSON.stringify(product.specifications_fa),
        product.name_en, product.description_en, JSON.stringify(product.specifications_en),
      ],
    );

    for (const sourceId of product.post_ids) {
      const linkedProducts = productsBySourceId.get(sourceId) ?? [];
      linkedProducts.push(product.id);
      productsBySourceId.set(sourceId, linkedProducts);
    }
  }

  const sourceRows = new Map();
  for (const post of audit.posts) {
    const relatedProducts = (productsBySourceId.get(post.id) ?? []).map((id) => audit.products.find((item) => item.id === id));
    const product = relatedProducts[0] ?? null;
    const found = await client.query("SELECT id FROM instagram_sources WHERE source_url = $1 LIMIT 1", [post.source_url]);
    let sourceId = found.rows[0]?.id;
    if (!sourceId) {
      const variants = product ? { fa: product.variants_fa ?? [], en: [] } : null;
      const inserted = await client.query(
        `INSERT INTO instagram_sources (
           source_url, shortcode, post_date, caption_excerpt, product_name, category,
           variants, price_source, price_status, source_image_path, confidence, review_status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, 'pending')
         RETURNING id`,
        [
          post.source_url,
          post.id,
          post.published_date ? new Date(`${post.published_date}T00:00:00.000Z`) : null,
          post.caption_fa,
          product?.name_fa ?? null,
          product?.category_fa ?? null,
          variants ? JSON.stringify(variants) : null,
          product?.source_price_text ?? null,
          product?.price_status ?? "not_a_product_post",
          post.site_image_path,
          product?.confidence ?? "source-pack",
        ],
      );
      sourceId = inserted.rows[0]?.id;
    }
    if (!sourceId) throw new Error(`Could not import Instagram source ${post.id}.`);
    sourceRows.set(post.id, sourceId);

    for (const productItem of relatedProducts) {
      const productId = productsById.get(productItem.id);
      await client.query(
        `INSERT INTO product_sources (product_id, source_id)
         VALUES ($1, $2)
         ON CONFLICT (product_id, source_id) DO NOTHING`,
        [productId, sourceId],
      );
      await client.query(
        `INSERT INTO product_media (
           product_id, source_id, kind, storage_key, public_url, alt_fa, alt_en,
           generation_method, review_status, sort_order
         )
         SELECT $1, $2, 'source', $3, $3, $4, $5, NULL, 'approved', $6
         WHERE NOT EXISTS (
           SELECT 1 FROM product_media WHERE product_id = $1 AND public_url = $3 AND kind = 'source'
         )`,
        [
          productId, sourceId, post.site_image_path,
          `${productItem.name_fa}؛ تصویر منبع از پست Instagram ${post.id}`,
          `${productItem.name_en}; source image from Instagram post ${post.id}`,
          post.source_order,
        ],
      );
    }
  }

  const contactSetting = {
    fa: `راه‌های ارتباطی ثبت‌شده: تماس ${audit.contact.phone_display} (درج‌شده روی تصویر پست ${audit.contact.phone_source_date})، کانال تلگرام و صفحهٔ اینستاگرام. برای قیمت و موجودی روز استعلام بگیرید.`,
    en: `Recorded contact methods: call ${audit.contact.phone_display} (shown on the ${audit.contact.phone_source_date} post image), Telegram channel, and Instagram profile. Ask for current price and availability.`,
  };
  await client.query(
    `INSERT INTO site_settings (key, value)
     VALUES ('contact', $1::jsonb)
     ON CONFLICT (key) DO NOTHING`,
    [JSON.stringify(contactSetting)],
  );

  await client.query("COMMIT");
  console.info(`Imported ${audit.posts.length} Instagram posts, ${productsById.size} quote-only products, and ${categoryByFa.size} categories.`);
  console.info(`Linked ${sourceRows.size} source records; product prices and inventory remain unconfirmed.`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.query("SELECT pg_advisory_unlock($1, $2)", [1_954_017_221, 2]).catch(() => undefined);
  client.release();
  await pool.end();
}
