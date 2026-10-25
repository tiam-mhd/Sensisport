import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  bigint,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const localeEnum = pgEnum("locale", ["fa", "en"]);
export const userRoleEnum = pgEnum("user_role", ["customer", "admin"]);
export const productStatusEnum = pgEnum("product_status", ["draft", "published", "archived"]);
export const priceStatusEnum = pgEnum("price_status", ["unverified", "confirmed", "quote"]);
export const mediaKindEnum = pgEnum("media_kind", ["source", "site"]);
export const reviewStatusEnum = pgEnum("review_status", ["pending", "approved", "rejected"]);
export const orderStatusEnum = pgEnum("order_status", [
  "quote_requested", "pending_payment", "paid", "processing", "shipped", "completed", "cancelled", "payment_failed",
]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "authorized", "paid", "failed", "refunded"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  role: userRoleEnum("role").notNull().default("customer"),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("users_role_idx").on(table.role)]);

export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 100 }),
  recipientName: varchar("recipient_name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  country: varchar("country", { length: 2 }),
  province: varchar("province", { length: 120 }).notNull(),
  city: varchar("city", { length: 120 }).notNull(),
  postalCode: varchar("postal_code", { length: 30 }),
  addressLine: text("address_line").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("addresses_user_idx").on(table.userId)]);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const categoryTranslations = pgTable("category_translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  locale: localeEnum("locale").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
}, (table) => [uniqueIndex("category_translation_locale_unique").on(table.categoryId, table.locale)]);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  sku: varchar("sku", { length: 100 }),
  status: productStatusEnum("status").notNull().default("draft"),
  featured: boolean("featured").notNull().default(false),
  priceStatus: priceStatusEnum("price_status").notNull().default("unverified"),
  priceMinor: bigint("price_minor", { mode: "number" }),
  currency: varchar("currency", { length: 12 }),
  trackInventory: boolean("track_inventory").notNull().default(false),
  stock: integer("stock").notNull().default(0),
  confidence: varchar("confidence", { length: 24 }).notNull().default("unverified"),
  sourceReviewStatus: reviewStatusEnum("source_review_status").notNull().default("pending"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  index("products_status_featured_idx").on(table.status, table.featured, table.createdAt),
  index("products_category_idx").on(table.categoryId),
]);

export const productTranslations = pgTable("product_translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  locale: localeEnum("locale").notNull(),
  name: varchar("name", { length: 220 }).notNull(),
  description: text("description"),
  specifications: jsonb("specifications").$type<Record<string, string>>().notNull().default({}),
}, (table) => [uniqueIndex("product_translation_locale_unique").on(table.productId, table.locale)]);

export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 100 }),
  options: jsonb("options").$type<Record<string, string>>().notNull().default({}),
  priceMinor: bigint("price_minor", { mode: "number" }),
  currency: varchar("currency", { length: 12 }),
  stock: integer("stock").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("product_variants_product_idx").on(table.productId)]);

export const instagramSources = pgTable("instagram_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceUrl: text("source_url").notNull(),
  shortcode: varchar("shortcode", { length: 100 }),
  postDate: timestamp("post_date", { withTimezone: true }),
  captionExcerpt: text("caption_excerpt"),
  productName: varchar("product_name", { length: 220 }),
  category: varchar("category", { length: 160 }),
  variants: jsonb("variants").$type<Record<string, string[]>>(),
  priceSource: text("price_source"),
  priceStatus: varchar("price_status", { length: 32 }).notNull().default("unknown"),
  sourceImagePath: text("source_image_path"),
  confidence: varchar("confidence", { length: 24 }).notNull().default("unverified"),
  reviewStatus: reviewStatusEnum("review_status").notNull().default("pending"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const productSources = pgTable("product_sources", {
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").notNull().references(() => instagramSources.id, { onDelete: "cascade" }),
}, (table) => [uniqueIndex("product_source_unique").on(table.productId, table.sourceId)]);

export const productMedia = pgTable("product_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").references(() => instagramSources.id, { onDelete: "set null" }),
  kind: mediaKindEnum("kind").notNull(),
  storageKey: text("storage_key").notNull(),
  publicUrl: text("public_url").notNull(),
  altFa: varchar("alt_fa", { length: 240 }),
  altEn: varchar("alt_en", { length: 240 }),
  generationMethod: varchar("generation_method", { length: 40 }),
  reviewStatus: reviewStatusEnum("review_status").notNull().default("pending"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
}, (table) => [index("product_media_product_idx").on(table.productId, table.sortOrder)]);

export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  sessionToken: varchar("session_token", { length: 128 }).unique(),
  updatedAt: updatedAt(),
  createdAt: createdAt(),
});

export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  quantity: integer("quantity").notNull(),
  createdAt: createdAt(),
}, (table) => [uniqueIndex("cart_item_unique").on(table.cartId, table.productId, table.variantId)]);

export const wishlists = pgTable("wishlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  sessionToken: varchar("session_token", { length: 128 }).unique(),
  createdAt: createdAt(),
});

export const wishlistItems = pgTable("wishlist_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  wishlistId: uuid("wishlist_id").notNull().references(() => wishlists.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
}, (table) => [uniqueIndex("wishlist_item_unique").on(table.wishlistId, table.productId)]);

export const shippingMethods = pgTable("shipping_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 80 }).notNull().unique(),
  nameFa: varchar("name_fa", { length: 180 }),
  nameEn: varchar("name_en", { length: 180 }),
  costMinor: bigint("cost_minor", { mode: "number" }),
  currency: varchar("currency", { length: 12 }),
  enabled: boolean("enabled").notNull().default(false),
  detailsFa: text("details_fa"),
  detailsEn: text("details_en"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 60 }).notNull().unique(),
  discountPercent: integer("discount_percent"),
  discountMinor: bigint("discount_minor", { mode: "number" }),
  currency: varchar("currency", { length: 12 }),
  minimumSubtotalMinor: bigint("minimum_subtotal_minor", { mode: "number" }),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  active: boolean("active").notNull().default(false),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  publicId: varchar("public_id", { length: 64 }).notNull().unique(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  status: orderStatusEnum("status").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  recipientName: varchar("recipient_name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  addressSnapshot: jsonb("address_snapshot").$type<Record<string, string>>(),
  subtotalMinor: bigint("subtotal_minor", { mode: "number" }),
  shippingMinor: bigint("shipping_minor", { mode: "number" }),
  discountMinor: bigint("discount_minor", { mode: "number" }),
  totalMinor: bigint("total_minor", { mode: "number" }),
  currency: varchar("currency", { length: 12 }),
  shippingMethodSnapshot: jsonb("shipping_method_snapshot").$type<Record<string, unknown>>(),
  couponCode: varchar("coupon_code", { length: 60 }),
  note: text("note"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("orders_user_created_idx").on(table.userId, table.createdAt), index("orders_status_created_idx").on(table.status, table.createdAt)]);

export const inventoryMovements = pgTable("inventory_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  delta: integer("delta").notNull(),
  reason: varchar("reason", { length: 80 }).notNull(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  createdAt: createdAt(),
}, (table) => [index("inventory_movements_product_idx").on(table.productId, table.createdAt), index("inventory_movements_order_idx").on(table.orderId)]);

export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  fromStatus: orderStatusEnum("from_status"),
  toStatus: orderStatusEnum("to_status").notNull(),
  note: varchar("note", { length: 500 }),
  createdAt: createdAt(),
}, (table) => [index("order_status_history_order_idx").on(table.orderId, table.createdAt)]);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  slugSnapshot: varchar("slug_snapshot", { length: 180 }).notNull(),
  titleSnapshot: varchar("title_snapshot", { length: 220 }).notNull(),
  optionsSnapshot: jsonb("options_snapshot").$type<Record<string, string>>(),
  unitPriceMinor: bigint("unit_price_minor", { mode: "number" }),
  quantity: integer("quantity").notNull(),
  lineTotalMinor: bigint("line_total_minor", { mode: "number" }),
  currency: varchar("currency", { length: 12 }),
  createdAt: createdAt(),
}, (table) => [index("order_items_order_idx").on(table.orderId)]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 80 }).notNull(),
  providerReference: varchar("provider_reference", { length: 200 }),
  status: paymentStatusEnum("status").notNull().default("pending"),
  amountMinor: bigint("amount_minor", { mode: "number" }),
  currency: varchar("currency", { length: 12 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("payments_order_idx").on(table.orderId)]);

export const siteSettings = pgTable("site_settings", {
  key: varchar("key", { length: 120 }).primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entity_type", { length: 80 }),
  entityId: varchar("entity_id", { length: 160 }),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  ipHash: varchar("ip_hash", { length: 128 }),
  createdAt: createdAt(),
}, (table) => [index("audit_logs_created_idx").on(table.createdAt), index("audit_logs_actor_idx").on(table.actorId, table.createdAt)]);

export const rateLimits = pgTable("rate_limits", {
  key: varchar("key", { length: 200 }).primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: updatedAt(),
});
