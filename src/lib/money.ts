export function isCurrencyCode(value: string): boolean {
  return /^[A-Z]{3}$/.test(value);
}

export function isSafeMinorAmount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function formatMoney(minorAmount: number | null, currency: string | null, locale: string): string | null {
  if (minorAmount === null || currency === null || !isSafeMinorAmount(minorAmount) || !isCurrencyCode(currency)) return null;
  try {
    const fractionDigits = new Intl.NumberFormat(locale, { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
    const majorAmount = minorAmount / 10 ** fractionDigits;
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: fractionDigits }).format(majorAmount);
  } catch {
    return null;
  }
}
