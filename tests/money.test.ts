import assert from "node:assert/strict";
import test from "node:test";
import { formatMoney, isCurrencyCode, isSafeMinorAmount } from "@/lib/money";

test("currency codes must be uppercase ISO-style three-letter codes", () => {
  assert.equal(isCurrencyCode("IRR"), true);
  assert.equal(isCurrencyCode("usd"), false);
  assert.equal(isCurrencyCode("US"), false);
});

test("minor-unit amounts reject negatives, fractions, and unsafe integers", () => {
  assert.equal(isSafeMinorAmount(0), true);
  assert.equal(isSafeMinorAmount(Number.MAX_SAFE_INTEGER), true);
  assert.equal(isSafeMinorAmount(-1), false);
  assert.equal(isSafeMinorAmount(1.5), false);
  assert.equal(isSafeMinorAmount(Number.MAX_SAFE_INTEGER + 1), false);
});

test("money formatting converts minor units using the currency fraction digits", () => {
  assert.equal(formatMoney(12345, "USD", "en-US"), "$123.45");
  assert.equal(formatMoney(null, "USD", "en-US"), null);
  assert.equal(formatMoney(100, "bad", "en-US"), null);
});
