/**
 * Format a rand amount as ZAR using South African locale conventions.
 * Centralising this keeps currency rendering consistent across the app.
 */
export function formatZar(amount: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(amount);
}
