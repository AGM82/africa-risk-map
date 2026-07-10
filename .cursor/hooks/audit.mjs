#!/usr/bin/env node
/**
 * audit.mjs — fire-and-forget structured audit logger.
 *
 * Appends one JSON record per agent event to a local, git-ignored log.
 * Never blocks: on any failure it returns a valid empty hook response.
 *
 * Log schema (OWASP ASVS V7.1):
 * {
 *   "timestamp": "<ISO-8601>",       // when the event was logged
 *   "hookEvent": "<string>",          // e.g. "afterShellExecution"
 *   "actor": "cursor-agent",          // always the Cursor agent in this context
 *   "command": "<string|null>",       // shell command, if applicable
 *   "file": "<string|null>",          // file path, if applicable
 *   "outcome": "ok|error|unknown",    // normalised result
 *   "sha": "<string|null>"            // git HEAD SHA at time of event, if available
 * }
 *
 * Usage:
 *   Normal: echo '<cursor-hook-json>' | node .cursor/hooks/audit.mjs
 *   Self-test: node .cursor/hooks/audit.mjs --self-test
 */

import { appendFile, mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";

// ── Self-test mode ────────────────────────────────────────────────────────────
// Run with --self-test to verify the hook is syntactically valid and emits a
// record in the expected schema. Exit 0 on success, 1 on failure.
if (process.argv.includes("--self-test")) {
  const required = ["timestamp", "hookEvent", "actor", "command", "file", "outcome", "sha"];
  const record = buildRecord({ hookEvent: "self-test", command: null, file: null, outcome: "ok" });
  const missing = required.filter((k) => !(k in record));
  if (missing.length) {
    process.stderr.write(`[audit] Self-test FAILED — missing fields: ${missing.join(", ")}\n`);
    process.exit(1);
  }
  process.stdout.write(`[audit] Self-test OK — schema valid\n`);
  process.stdout.write(JSON.stringify(record, null, 2) + "\n");
  process.exit(0);
}

// ── Normal hook execution ─────────────────────────────────────────────────────
function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(data));
  });
}

function getSha() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

function buildRecord({ hookEvent, command, file, outcome }) {
  return {
    timestamp: new Date().toISOString(),
    hookEvent: String(hookEvent ?? "unknown"),
    actor: "cursor-agent",
    command: command ? String(command).slice(0, 500) : null,
    file: file ? String(file).slice(0, 300) : null,
    outcome: ["ok", "error", "unknown"].includes(outcome) ? outcome : "unknown",
    sha: getSha(),
  };
}

const MAX_CHARS = 4000;
const projectDir = process.env.CURSOR_PROJECT_DIR ?? process.cwd();
const logPath = join(projectDir, ".cursor", "hooks", "logs", "agent-audit.log");

const raw = await readStdin();

try {
  let parsed = {};
  try { parsed = JSON.parse(raw.trim().slice(0, MAX_CHARS)); } catch { /* best-effort */ }

  const record = buildRecord({
    hookEvent: parsed.hookEvent ?? parsed.event ?? "unknown",
    command: parsed.command ?? parsed.cmd ?? null,
    file: parsed.file ?? parsed.path ?? null,
    outcome: parsed.exitCode === 0 ? "ok" : parsed.exitCode != null ? "error" : "unknown",
  });

  await mkdir(dirname(logPath), { recursive: true });
  await appendFile(logPath, JSON.stringify(record) + "\n", "utf8");
} catch {
  // Auditing is best-effort; never interrupt the agent if logging fails.
}

process.stdout.write("{}");
process.exit(0);
