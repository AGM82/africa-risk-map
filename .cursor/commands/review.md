# /review

Run a pre-commit review pass on the current changes. Report findings first — do not fix anything until instructed.

## Steps

1. **Run checks.** Execute `npm run typecheck`, `npm run lint`, and `npm run test`. Report every failure with the exact file and line number.

2. **Review the diff.** Run `git diff` (staged and unstaged) and review every changed line for:
   - Logic errors, unhandled edge cases, and missing error handling.
   - Security issues per `10-security-popia.mdc`: input validation, secrets in source, authorization gaps, XSS, SQL injection.
   - Personal information logged or hard-coded.
   - Accessibility regressions on any UI changes (contrast, focus, ARIA, keyboard).
   - Coverage gaps: if a new function or branch was added, flag if it has no test.

3. **Check new dependencies.** For every package added or changed in the diff:
   - Verify a justification comment or plan entry exists for the addition.
   - Flag any package without a clear justification as a finding.

4. **Output findings as a structured table.** Use exactly this format — one row per finding, sorted by severity descending:

```
| Severity | File:Line | Rule | Finding | Recommended fix |
|----------|-----------|------|---------|-----------------|
| critical | src/api.ts:42 | 10-security-popia | API key hardcoded in source | Move to environment variable |
| high | src/Form.tsx:18 | 31-design | Input has no accessible label | Add aria-label or <label for=...> |
| medium | src/utils.ts:7 | 00-core | New function has no test | Add unit test for edge cases |
| low | src/App.tsx:3 | 30-react-stack | Inline style used for static styling | Replace with Tailwind utility class |
| info | package.json | 40-tooling | New dep lucide-react has no justification comment | Add justification to plan or PR body |
```

**Severity taxonomy:**

- `critical` — security vulnerability, data exposure, or broken auth
- `high` — accessibility regression, logic error that produces wrong results, or missing auth check
- `medium` — missing test for new logic, unhandled error path, or style rule violation
- `low` — nit-level style issue, minor deviation from conventions
- `info` — observation with no action required

5. **End with a summary line** in this exact format (machine-scannable):

   ```
   X findings: N critical, N high, N medium, N low, N info
   ```

6. **Wait for instruction** before making any change.
