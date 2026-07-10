# /audit

Run a whole-repo, point-in-time health audit — not scoped to a diff. Use this when nothing has necessarily changed recently but you want to know the current state of the codebase, security posture, structure, and documentation. Report findings first — do not fix anything until instructed.

This is distinct from `/review` (scoped to `git diff`, for reviewing a specific changeset) and `/guardrail-upgrade` (compares a _child_ project against this template — not meaningful to run against the template itself). `/audit` looks at everything currently on disk, regardless of when it last changed.

## Steps

1. **Code correctness.** Run `npm run typecheck`, `npm run lint`, `npm run test:coverage`, and `npm run build`. Compare coverage against the thresholds in `00-core.mdc` (lines ≥ 80%, functions ≥ 80%, branches ≥ 70%). Report every failure with the exact file and line number.

2. **Security & supply chain.** Run `npm audit`, `npm audit signatures`, and `node .cursor/hooks/audit.mjs --self-test`. Review `package.json` for production-dependency pinning per `40-tooling-supply-chain.mdc` (production deps should use `--save-exact`; devDependencies may use `^` ranges). Note that gitleaks, Semgrep, SBOM generation, and build-provenance attestation only run in CI (`.github/workflows/ci.yml`) and cannot be replicated locally without Docker — state this as a known gap rather than skipping silently.

3. **Structural integrity & dead code.** Run `node .github/scripts/check-manifest-drift.mjs` to confirm `guardrail-layers.json`'s Layer 1 file list matches what's actually on disk. Confirm `.cursor/guardrail-version` matches `guardrail-layers.json` → `guardrailVersion`. Run `npm run knip` to find unused files, unused exports, and unused/unlisted npm dependencies.

4. **Design & accessibility.** Review `src/components/**` against `31-design.mdc` and `32-ux-behavioural.mdc`. Confirm the axe-core accessibility checks (`src/test/axe.ts`) are wired into the test run and passing — a regression here is a `high` finding per the `/review` severity taxonomy.

5. **Architecture & convention drift.** Compare `src/` against the canonical patterns named in `90-project-context.mdc` (`src/components/Greeting.tsx`, `src/lib/currency.ts`, and their tests). Flag any file that duplicates a pattern instead of extending it.

6. **Documentation consistency.** Cross-check `AGENTS.md`'s rule-file table, `docs/links.md`'s command/workflow tables, and `README.md` against what actually exists on disk: every `.cursor/commands/*.md` file should be listed, every `.github/workflows/*.yml` should be listed, and every `.cursor/rules/*.mdc` should be referenced.

7. **Holistic AI pass.** Run the Bugbot subagent in `natural language` diff mode (per the `review-bugbot` skill) against the full `src/` tree, describing it as "the entire src/ directory as it currently stands, not a diff" so it reviews everything rather than expecting a changeset. Use this to catch cross-file issues the static checks above miss.

8. **Output findings as a structured table.** Use the same format as `/review`:

```
| Severity | File:Line | Rule | Finding | Recommended fix |
|----------|-----------|------|---------|-----------------|
```

Same severity taxonomy as `/review` (critical / high / medium / low / info).

9. **End with a summary line** in this exact format:

   ```
   X findings: N critical, N high, N medium, N low, N info
   ```

10. **Wait for instruction** before making any change.
