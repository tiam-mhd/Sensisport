import rawAudit from "../../../content/instagram-source-audit.json";

export type InstagramPost = {
  id: string;
  source_url: string;
  kind: "post" | "reel";
  published_date: string | null;
  caption_fa: string | null;
  caption_status: string;
  local_asset: string;
  media_type: "post_image" | "reel_poster";
  video_file_status: string;
  alt_text: string | null;
  source_order: number;
  site_image_path: string;
  product_ids: string[];
};

export type InstagramProduct = {
  id: string;
  slug: string;
  name_fa: string;
  name_en: string;
  category_fa: string;
  category_en: string;
  post_ids: string[];
  source_urls: string[];
  featured: boolean;
  confidence: string;
  description_fa: string;
  description_en: string;
  source_url: string;
  shortcode: string;
  post_date: string | null;
  site_image_path: string;
  review_status: string;
};

export type InstagramHighlight = {
  id: string;
  title_fa: string;
  url: string;
  site_cover_path: string;
  story_frames_status: string;
  story_frames_available: boolean;
  note_fa: string;
};

export type InstagramAudit = {
  source_url: string;
  capture_date: string;
  scope: {
    public_feed_items_observed: number;
    media_counts: Record<string, number>;
    captions_missing: number;
    reel_videos_downloaded: number;
    highlight_count: number;
    highlight_frames_available: number;
    note_fa: string;
    highlight_note_fa: string;
  };
  profile: {
    handle: string;
    display_name: string;
    bio_fa: string[];
    external_links: { label: string; url: string }[];
    profile_image_description: string;
  };
  contact: {
    phone_display: string;
    phone_href: string;
    phone_source_url: string;
    phone_source_date: string;
    phone_source_note_fa: string;
    instagram_url: string;
    telegram_url: string;
    eitaa_mentioned: boolean;
    eitaa_url: string | null;
    eitaa_note_fa: string;
  };
  products: InstagramProduct[];
  posts: InstagramPost[];
  highlights: InstagramHighlight[];
};

export const instagramAudit = rawAudit as unknown as InstagramAudit;
export const instagramPosts = instagramAudit.posts;
export const instagramHighlights = instagramAudit.highlights;
export const instagramProducts = instagramAudit.products;
export const instagramProductById = new Map(instagramProducts.map((product) => [product.id, product]));
export const instagramProductBySourceId = new Map(
  instagramProducts.flatMap((product) => product.post_ids.map((postId) => [postId, product] as const)),
);

export function safeSourceCaption(caption: string) {
  return caption.replace(/(\+98|0098|0)?[\s()-]*9(?:[\s()-]*\d){9}/g, "[شماره تماس درج‌شده در منبع]");
}

export function formatSourceDate(date: string | null, locale: "fa" | "en") {
  if (!date) return locale === "fa" ? "تاریخ ثبت نشده" : "Date not listed";
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
    calendar: locale === "fa" ? "persian" : "gregory",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}
