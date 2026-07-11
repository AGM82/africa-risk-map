/** Escape a CSV cell (RFC 4180-ish). */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
}

export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number | null | undefined)[])[],
): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvCell).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

export function ledgerRowsToCsv(
  rows: readonly Readonly<{
    id: string;
    effectiveDate: string;
    kind: string;
    organisationName: string;
    siteName: string;
    categoryLabel: string;
    delta: number;
    note: string | null;
  }>[],
): string {
  return toCsv(
    ["id", "effectiveDate", "kind", "organisation", "site", "category", "delta", "note"],
    rows.map((r) => [
      r.id,
      r.effectiveDate,
      r.kind,
      r.organisationName,
      r.siteName,
      r.categoryLabel,
      r.delta,
      r.note,
    ]),
  );
}

export function auditRowsToCsv(
  rows: readonly Readonly<{
    id: string;
    createdAt: string;
    actorUserId: string;
    actorRole: string;
    clientId: string | null;
    entityType: string;
    entityId: string;
    action: string;
  }>[],
): string {
  return toCsv(
    ["id", "createdAt", "actorUserId", "actorRole", "clientId", "entityType", "entityId", "action"],
    rows.map((r) => [
      r.id,
      r.createdAt,
      r.actorUserId,
      r.actorRole,
      r.clientId,
      r.entityType,
      r.entityId,
      r.action,
    ]),
  );
}

export function rollupRowsToCsv(
  rows: readonly Readonly<{
    clientId: string;
    clientName: string;
    organisationCount: number;
    locationCount: number;
    totalLives: number;
    monthlyPremium: number | null;
    monthlyAggregate: number | null;
    policyYear: string | null;
    policyStatus: string | null;
  }>[],
): string {
  return toCsv(
    [
      "clientId",
      "clientName",
      "organisations",
      "locations",
      "lives",
      "monthlyPremium",
      "monthlyAggregate",
      "policyYear",
      "policyStatus",
    ],
    rows.map((r) => [
      r.clientId,
      r.clientName,
      r.organisationCount,
      r.locationCount,
      r.totalLives,
      r.monthlyPremium,
      r.monthlyAggregate,
      r.policyYear,
      r.policyStatus,
    ]),
  );
}
