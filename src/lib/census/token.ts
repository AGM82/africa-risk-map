import { createHash, randomBytes } from "node:crypto";

/** Generate an unguessable census invite token (URL-safe). */
export function generateCensusToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Persist only the SHA-256 hash of the raw token. */
export function hashCensusToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function censusPathForToken(rawToken: string): string {
  return `/census/${rawToken}`;
}

export const DEFAULT_INVITATION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
