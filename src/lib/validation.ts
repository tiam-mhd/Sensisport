import { z } from "zod";

export const localeSchema = z.enum(["fa", "en"]);
export const emailSchema = z.string().trim().email().max(320).transform((value) => value.toLowerCase());
export const passwordSchema = z.string().min(10).max(200);
export const slugSchema = z.string().trim().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const addressSchema = z.object({
  recipientName: z.string().trim().min(2).max(200),
  phone: z.string().trim().min(6).max(40),
  province: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(120),
  postalCode: z.string().trim().max(30).optional().or(z.literal("")),
  addressLine: z.string().trim().min(8).max(1500),
  country: z.string().trim().length(2).optional(),
});

export function safeJson<T>(value: unknown, schema: z.ZodType<T>): T | null {
  const result = schema.safeParse(value);
  return result.success ? result.data : null;
}
