# Agent instructions

Cross-tool entry point for AI coding agents — Cursor Agent and any other agent
that reads `AGENTS.md`. Keep this short and action-oriented. The detailed,
scoped rules live in `.cursor/rules/*.mdc`; this file is the always-on summary.

## Capability model

This template enables a single developer to operate at expert-team level across
six domains. Apply the relevant domain rules whenever the work touches that area:

| Domain                         | Rule file                         |
| ------------------------------ | --------------------------------- |
| Engineering (core)             | `00-core.mdc`                     |
| Security & privacy             | `10-security-popia.mdc`           |
| Commits                        | `20-commits.mdc`                  |
| Frontend stack                 | `30-react-stack.mdc`              |
| **Visual & graphic design**    | `31-design.mdc`                   |
| **UX & behavioural science**   | `32-ux-behavioural.mdc`           |
| **Data science & measurement** | `33-data-science.mdc`             |
| Tooling & supply chain         | `40-tooling-supply-chain.mdc`     |
| **AI tool evaluation**         | `50-ai-tooling.mdc`               |
| Backend & API design           | `60-backend-api.mdc`              |
| Database & data access         | `61-database.mdc`                 |
| Deployment & observability     | `62-deployment-observability.mdc` |
| Project specifics              | `90-project-context.mdc`          |

The Backend/Database/Deployment rules are glob-scoped and inert until a project
actually adds a server, database, or deploy pipeline — they cost nothing to keep
installed even in the current frontend-only demo scaffold.

**Tool philosophy**: use the best available AI agent for the task. Cursor is the
current primary coding agent. Evaluate new tools using the framework in
`50-ai-tooling.mdc` — stack-first (addition before replacement), high bar for
switching the primary agent.

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build (typecheck + bundle)
- `npm run typecheck` — TypeScript, no emit
- `npm run lint` — ESLint
- `npm run test` — test suite (Vitest)

## Slash commands (type in Cursor chat)

- `/review` — run checks and review staged changes; report by severity before fixing anything
- `/audit` — whole-repo, point-in-time health audit (code, security, structure, design, docs) — not scoped to a diff
- `/pr` — confirm checks pass, write a Conventional Commit, push, and open a pull request
- `/update-deps` — update dependencies one at a time, re-testing after each
- `/guardrail-upgrade` — compare an existing project against this template, show a gap analysis by layer, and implement approved upgrades

## Verify before you finish

After a series of edits, run `npm run typecheck`, `npm run lint`, and
`npm run test`. A task is not done until all three pass. Do not modify tests to
make failing code pass, and do not disable a lint/type rule to silence an error
— fix the cause.

## How to work

- Plan before non-trivial changes; get the plan approved before writing code.
- Make the smallest change that satisfies the requirement. Search for existing
  patterns and extend them before inventing new ones.
- Use only what you can verify: files you have read, the user's instructions,
  and tool results. If information is missing, search, then ask.

## Autonomy boundaries

**Permitted autonomously** — no human gate needed:

- Read any file or directory.
- Run `typecheck`, `lint`, `test`, `build`, and other read-only checks.
- Write or edit files inside `src/`, `.cursor/rules/`, `.cursor/commands/`, `docs/`.
- Open draft PRs and push to feature branches.

**Always require explicit human approval** — halt and ask before proceeding:

- `git push` to `main` or any protected branch.
- `npm publish` or any registry publish.
- Destructive file operations (recursive delete, overwriting files outside `src/`).
- Changes to `.env`, secrets, or environment variable configuration.
- Disabling or weakening a CI job, hook, or lint rule.

**Background agents additionally must:**

- Write a plan to `.cursor/plans/` before any write outside `src/`.
- Halt and surface the plan for approval before executing it.
- Never commit directly to `main`.

## Hard stops

- No secrets, credentials, or real client/personal data in source, logs, or
  commits. Secrets come from environment variables; `.env` is git-ignored.
- Validate input at every trust boundary; use parameterised queries only.
- Never log personal information. Flag any new field that could be personal
  information in the plan before implementing it.

## Where things are

- Working rules: `.cursor/rules/00-core.mdc`
- Security & POPIA: `.cursor/rules/10-security-popia.mdc`
- Commits (Conventional Commits): `.cursor/rules/20-commits.mdc`
- Frontend stack: `.cursor/rules/30-react-stack.mdc`
- Visual & graphic design: `.cursor/rules/31-design.mdc`
- UX & behavioural science: `.cursor/rules/32-ux-behavioural.mdc`
- Data science & measurement: `.cursor/rules/33-data-science.mdc`
- Tooling & supply chain: `.cursor/rules/40-tooling-supply-chain.mdc`
- AI tool evaluation: `.cursor/rules/50-ai-tooling.mdc`
- Backend & API design: `.cursor/rules/60-backend-api.mdc`
- Database & data access: `.cursor/rules/61-database.mdc`
- Deployment & observability: `.cursor/rules/62-deployment-observability.mdc`
- Project specifics (fill this in): `.cursor/rules/90-project-context.mdc`
- Playbook dashboard: `playbook.html` (hosted on Cloudflare Pages)

> Keep this file in sync with `.cursor/rules/00-core.mdc`. If the two ever
> disagree, the rule files are authoritative for Cursor; this file is what
> other tools read.
