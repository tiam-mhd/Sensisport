import assert from "node:assert/strict";
import test from "node:test";
import { addressSchema, emailSchema, localeSchema, slugSchema } from "@/lib/validation";

test("locale and slug schemas accept only the supported route forms", () => {
  assert.equal(localeSchema.safeParse("fa").success, true);
  assert.equal(localeSchema.safeParse("fr").success, false);
  assert.equal(slugSchema.safeParse("ninja-gloves-01").success, true);
  assert.equal(slugSchema.safeParse("Ninja Gloves").success, false);
});

test("email schema trims and normalizes email addresses", () => {
  assert.equal(emailSchema.parse("  Store@Example.com "), "store@example.com");
  assert.equal(emailSchema.safeParse("not-an-email").success, false);
});

test("address schema requires a deliverable address and bounds optional fields", () => {
  assert.equal(addressSchema.safeParse({ recipientName: "Sam Lee", phone: "+10000000000", province: "North", city: "City", addressLine: "123 Sample Street" }).success, true);
  assert.equal(addressSchema.safeParse({ recipientName: "S", phone: "123", province: "", city: "City", addressLine: "short" }).success, false);
});
