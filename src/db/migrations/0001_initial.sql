CREATE TYPE locale AS ENUM ('fa', 'en');
CREATE TYPE user_role AS ENUM ('customer', 'admin');
CREATE TYPE product_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE price_status AS ENUM ('unverified', 'confirmed', 'quote');
CREATE TYPE media_kind AS ENUM ('source', 'site');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE order_status AS ENUM (
  'quote_requested', 'pending_payment', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'payment_failed'
);
CREATE TYPE payment_status AS ENUM ('pending', 'authorized', 'paid', 'failed', 'refunded');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(320) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name varchar(200) NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX users_role_idx ON users (role);

CREATE TABLE addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label varchar(100),
  recipient_name varchar(200) NOT NULL,
  phone varchar(40) NOT NULL,
  country varchar(2),
  province varchar(120) NOT NULL,
  city varchar(120) NOT NULL,
  postal_code varchar(30),
  address_line text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX addresses_user_idx ON addresses (user_id);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(120) NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE category_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  locale locale NOT NULL,
  name varchar(160) NOT NULL,
  description text
);
CREATE UNIQUE INDEX category_translation_locale_unique ON category_translations (category_id, locale);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  slug varchar(180) NOT NULL UNIQUE,
  sku varchar(100),
  status product_status NOT NULL DEFAULT 'draft',
  featured boolean NOT NULL DEFAULT false,
  price_status price_status NOT NULL DEFAULT 'unverified',
  price_minor bigint,
  currency varchar(12),
  track_inventory boolean NOT NULL DEFAULT false,
  stock integer NOT NULL DEFAULT 0,
  confidence varchar(24) NOT NULL DEFAULT 'unverified',
  source_review_status review_status NOT NULL DEFAULT 'pending',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_status_featured_idx ON products (status, featured, created_at);
CREATE INDEX products_category_idx ON products (category_id);

CREATE TABLE product_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  locale locale NOT NULL,
  name varchar(220) NOT NULL,
  description text,
  specifications jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX product_translation_locale_unique ON product_translations (product_id, locale);

CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku varchar(100),
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_minor bigint,
  currency varchar(12),
  stock integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_variants_product_idx ON product_variants (product_id);

CREATE TABLE instagram_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text NOT NULL,
  shortcode varchar(100),
  post_date timestamptz,
  caption_excerpt text,
  product_name varchar(220),
  category varchar(160),
  variants jsonb,
  price_source text,
  price_status varchar(32) NOT NULL DEFAULT 'unknown',
  source_image_path text,
  confidence varchar(24) NOT NULL DEFAULT 'unverified',
  review_status review_status NOT NULL DEFAULT 'pending',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE product_sources (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES instagram_sources(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX product_source_unique ON product_sources (product_id, source_id);

CREATE TABLE product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  source_id uuid REFERENCES instagram_sources(id) ON DELETE SET NULL,
  kind media_kind NOT NULL,
  storage_key text NOT NULL,
  public_url text NOT NULL,
  alt_fa varchar(240),
  alt_en varchar(240),
  generation_method varchar(40),
  review_status review_status NOT NULL DEFAULT 'pending',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_media_product_idx ON product_media (product_id, sort_order);

CREATE TABLE carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  session_token varchar(128) UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX cart_item_unique ON cart_items (cart_id, product_id, variant_id);

CREATE TABLE wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  session_token varchar(128) UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id uuid NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX wishlist_item_unique ON wishlist_items (wishlist_id, product_id);

CREATE TABLE shipping_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL UNIQUE,
  name_fa varchar(180),
  name_en varchar(180),
  cost_minor bigint,
  currency varchar(12),
  enabled boolean NOT NULL DEFAULT false,
  details_fa text,
  details_en text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(60) NOT NULL UNIQUE,
  discount_percent integer,
  discount_minor bigint,
  currency varchar(12),
  minimum_subtotal_minor bigint,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id varchar(64) NOT NULL UNIQUE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status order_status NOT NULL,
  email varchar(320) NOT NULL,
  recipient_name varchar(200) NOT NULL,
  phone varchar(40) NOT NULL,
  address_snapshot jsonb,
  subtotal_minor bigint,
  shipping_minor bigint,
  discount_minor bigint,
  total_minor bigint,
  currency varchar(12),
  shipping_method_snapshot jsonb,
  coupon_code varchar(60),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_created_idx ON orders (user_id, created_at);
CREATE INDEX orders_status_created_idx ON orders (status, created_at);

CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  delta integer NOT NULL,
  reason varchar(80) NOT NULL,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inventory_movements_product_idx ON inventory_movements (product_id, created_at);
CREATE INDEX inventory_movements_order_idx ON inventory_movements (order_id);

CREATE TABLE order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  from_status order_status,
  to_status order_status NOT NULL,
  note varchar(500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_status_history_order_idx ON order_status_history (order_id, created_at);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  slug_snapshot varchar(180) NOT NULL,
  title_snapshot varchar(220) NOT NULL,
  options_snapshot jsonb,
  unit_price_minor bigint,
  quantity integer NOT NULL,
  line_total_minor bigint,
  currency varchar(12),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_idx ON order_items (order_id);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider varchar(80) NOT NULL,
  provider_reference varchar(200),
  status payment_status NOT NULL DEFAULT 'pending',
  amount_minor bigint,
  currency varchar(12),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_order_idx ON payments (order_id);

CREATE TABLE site_settings (
  key varchar(120) PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action varchar(120) NOT NULL,
  entity_type varchar(80),
  entity_id varchar(160),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash varchar(128),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_created_idx ON audit_logs (created_at);
CREATE INDEX audit_logs_actor_idx ON audit_logs (actor_id, created_at);

CREATE TABLE rate_limits (
  key varchar(200) PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
