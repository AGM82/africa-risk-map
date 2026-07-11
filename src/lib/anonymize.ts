/**
 * POPIA erasure primitive. A deletion/erasure request is served by redacting
 * the identifying fields of a record in place while preserving the
 * count/rate/history skeleton the underwriting file legally depends on —
 * hard-delete is never used, because it would destroy required underwriting
 * evidence (see 61-database.mdc and the POPIA section of
 * 90-project-context.mdc).
 *
 * This is the shared pattern; concrete personal-data models (e.g. an
 * insured-person record) plug their own identifying keys into `anonymise`
 * when they are introduced in their own to-dos. Kept schema-agnostic so it
 * stays a single tested code path rather than one hand-rolled per table.
 */

/** Marker written into redacted string fields so a row is visibly anonymised. */
export const ANONYMISED_MARKER = "[anonymised]";

/**
 * Returns a shallow copy of `record` with every key in `identifyingKeys`
 * redacted: string values become {@link ANONYMISED_MARKER}, any other
 * non-null value becomes `null`. Already-null/undefined values are left as-is,
 * and keys not listed are preserved untouched. The input is never mutated.
 */
export function anonymise<T extends Record<string, unknown>, K extends keyof T>(
  record: T,
  identifyingKeys: readonly K[],
): T {
  const redact = new Set<PropertyKey>(identifyingKeys);
  // Rebuild via entries (rather than indexed assignment) so no key is treated
  // as an object-injection sink; order and own string keys are preserved.
  const entries = Object.entries(record).map(([key, value]) => {
    if (!redact.has(key) || value === null || value === undefined) {
      return [key, value] as const;
    }
    return [key, typeof value === "string" ? ANONYMISED_MARKER : null] as const;
  });
  return Object.fromEntries(entries) as T;
}
