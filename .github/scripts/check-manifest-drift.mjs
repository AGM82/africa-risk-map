#!/usr/bin/env node
/**
 * Fails CI if guardrail-layers.json's Layer 1 file list has drifted from the
 * actual .cursor/rules, .cursor/commands, or .cursor/hooks directories.
 *
 * guardrail-layers.json is the single source of truth that /guardrail-upgrade
 * and downstream tools (e.g. Throughline) read to know which files exist in
 * this template. It has gone out of date silently before (.cursor/mcp.json
 * and .cursorignore existed in the repo for a while before being added to the
 * manifest) — this check turns that into a build failure instead of a latent
 * gap discovered by audit.
 *
 * Checks both directions:
 *   - a file exists on disk under a tracked directory but is not declared
 *   - a declared file under a tracked directory no longer exists on disk
 *
 * Usage: node .github/scripts/check-manifest-drift.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const MANIFEST_PATH = 'guardrail-layers.json';

// Directories whose contents must be fully and exactly reflected in Layer 1.
// Singleton files (AGENTS.md, .cursor/mcp.json, etc.) are declared directly
// in guardrail-layers.json and are not re-derived here — they don't have the
// "silently add a file to a folder" drift failure mode a directory listing does.
const TRACKED_DIRS = [
  { dir: '.cursor/rules', ext: '.mdc' },
  { dir: '.cursor/commands', ext: '.md' },
  { dir: '.cursor/hooks', ext: '.mjs' },
];

function fail(message) {
  process.stderr.write(`[check-manifest-drift] ${message}\n`);
  process.exitCode = 1;
}

if (!existsSync(MANIFEST_PATH)) {
  fail(`${MANIFEST_PATH} not found.`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const declared = new Set(manifest.adoptionLayers?.['1']?.files || []);

if (!declared.size) {
  fail('adoptionLayers["1"].files is empty or missing — nothing to check against.');
  process.exit(1);
}

let driftFound = false;

for (const { dir, ext } of TRACKED_DIRS) {
  if (!existsSync(dir)) continue;

  const onDisk = readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .map((f) => join(dir, f).replace(/\\/g, '/'));

  const undeclared = onDisk.filter((f) => !declared.has(f));
  for (const f of undeclared) {
    fail(`${f} exists on disk but is missing from guardrail-layers.json Layer 1.`);
    driftFound = true;
  }

  const declaredInDir = [...declared].filter((f) => f.startsWith(`${dir}/`));
  const removed = declaredInDir.filter((f) => !existsSync(f));
  for (const f of removed) {
    fail(`${f} is declared in guardrail-layers.json Layer 1 but no longer exists on disk.`);
    driftFound = true;
  }
}

if (driftFound) {
  process.stderr.write(
    '[check-manifest-drift] Add/remove the file(s) above from adoptionLayers["1"].files in ' +
      'guardrail-layers.json, bump schemaVersion if appropriate, and add a schemaChangelog entry.\n'
  );
  process.exit(1);
}

process.stdout.write('[check-manifest-drift] guardrail-layers.json Layer 1 matches the file tree.\n');
