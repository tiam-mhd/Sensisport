export type PaymentReadiness = { available: boolean; provider: "mock_dev" | null };

export function paymentReadiness(): PaymentReadiness {
  if (process.env.PAYMENT_PROVIDER === "mock" && process.env.NODE_ENV === "development") return { available: true, provider: "mock_dev" };
  return { available: false, provider: null };
}
