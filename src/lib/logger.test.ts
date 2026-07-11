import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger, logger } from "@/lib/logger";

function captureStreams() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
    stderr.push(String(chunk));
    return true;
  });
  return { stdout, stderr };
}

function parse(line: string | undefined): Record<string, unknown> {
  return JSON.parse(line ?? "{}") as Record<string, unknown>;
}

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.LOG_LEVEL;
});

describe("logger", () => {
  it("writes info as a single JSON line to stdout with message and fields", () => {
    const { stdout, stderr } = captureStreams();
    logger.info("hello", { userId: "u1" });
    expect(stderr).toHaveLength(0);
    expect(stdout).toHaveLength(1);
    expect((stdout[0] ?? "").endsWith("\n")).toBe(true);
    const entry = parse(stdout[0]);
    expect(entry.level).toBe("info");
    expect(entry.message).toBe("hello");
    expect(entry.userId).toBe("u1");
    expect(typeof entry.time).toBe("string");
  });

  it("routes warn and error to stderr", () => {
    const { stdout, stderr } = captureStreams();
    logger.warn("careful");
    logger.error("boom");
    expect(stdout).toHaveLength(0);
    expect(stderr).toHaveLength(2);
    expect(parse(stderr[1]).level).toBe("error");
  });

  it("suppresses levels below the configured threshold", () => {
    process.env.LOG_LEVEL = "warn";
    const { stdout, stderr } = captureStreams();
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    expect(stdout).toHaveLength(0);
    expect(stderr).toHaveLength(1);
  });

  it("falls back to info when LOG_LEVEL is unrecognised", () => {
    process.env.LOG_LEVEL = "not-a-level";
    const { stdout } = captureStreams();
    logger.debug("hidden");
    logger.info("shown");
    expect(stdout).toHaveLength(1);
    expect(parse(stdout[0]).message).toBe("shown");
  });

  it("child() merges bindings into every line, child overriding parent", () => {
    const { stdout } = captureStreams();
    const child = createLogger({ requestId: "r1", scope: "root" }).child({ scope: "child" });
    child.info("scoped");
    const entry = parse(stdout[0]);
    expect(entry.requestId).toBe("r1");
    expect(entry.scope).toBe("child");
  });
});
