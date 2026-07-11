import { describe, expect, it } from "vitest";
import {
  DEFAULT_INVITATION_TTL_MS,
  censusPathForToken,
  generateCensusToken,
  hashCensusToken,
} from "@/lib/census/token";

describe("census token helpers", () => {
  it("hashes tokens stably and generates unique raw tokens", () => {
    const a = generateCensusToken();
    const b = generateCensusToken();
    expect(a).not.toBe(b);
    expect(hashCensusToken(a)).toBe(hashCensusToken(a));
    expect(hashCensusToken(a)).not.toBe(hashCensusToken(b));
    expect(censusPathForToken(a)).toBe(`/census/${a}`);
    expect(DEFAULT_INVITATION_TTL_MS).toBe(14 * 24 * 60 * 60 * 1000);
  });
});
