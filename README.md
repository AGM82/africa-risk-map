# Africa Risk Map

Multi-tenant B2B platform for Human Risks / Lombard Insurance and its brokers to manage Personal Accident (PA) risk across Africa — starting with GRAA (Game Rangers Association of Africa).

Combines a sub-nationally rated territory risk map, organisation/location/headcount tracking, AI-assisted policy structuring, and a premium & aggregate calculator that reconciles with each client's issued Policy Schedule.

**Repository:** [github.com/AGM82/africa-risk-map](https://github.com/AGM82/africa-risk-map)

## Status

Guardrails foundation is in place (Cursor rules, hooks, Husky, CI, branch protection). The runnable app is still the template Vite + React demo scaffold; the Foundations phase will replace it with Next.js App Router, Prisma/PostGIS, and Clerk per the product plan.

Full product/architecture plan: [`.cursor/plans/africa-risk-map-platform-plan.md`](.cursor/plans/africa-risk-map-platform-plan.md)  
Day-to-day agent context: [`.cursor/rules/90-project-context.mdc`](.cursor/rules/90-project-context.mdc)

## Prerequisites

- Node.js 20 (see `.nvmrc`). With [fnm](https://github.com/Schniz/fnm): `fnm use`
- npm (ships with Node)

> **Windows PowerShell:** run commands on separate lines (no `&&`).

## Setup

```bash
npm install
npm run typecheck
npm run lint
npm run test
```

## Commands

| Command              | What it does                  |
| -------------------- | ----------------------------- |
| `npm run dev`        | Local Vite demo server        |
| `npm run build`      | Typecheck + production bundle |
| `npm run typecheck`  | TypeScript, no emit           |
| `npm run lint`       | ESLint                        |
| `npm run test`       | Vitest once                   |
| `npm run test:watch` | Vitest watch mode             |

A change is ready when `typecheck`, `lint`, and `test` all pass. Prefer feature branches + PRs — `main` is protected and requires CI.

## Guardrails

Scaffolded from [cursor-guardrails](https://github.com/AGM82/cursor-guardrails). Keep a separate **reference clone** of that template and run `/guardrail-upgrade` here when you want template updates. Do not treat this product repo as the template source.

## Out of scope

Claims management, invoicing/payment reconciliation, FAIS/PPR tooling beyond POPIA, and Policy Schedule PDF generation — see the project context file.
