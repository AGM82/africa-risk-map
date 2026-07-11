# Africa Risk Map

Multi-tenant B2B platform for Human Risks / Lombard Insurance and its brokers to manage Personal Accident (PA) risk across Africa — starting with GRAA (Game Rangers Association of Africa).

Combines a sub-nationally rated territory risk map, organisation/location/headcount tracking, AI-assisted policy structuring, and a premium & aggregate calculator that reconciles with each client's issued Policy Schedule.

**Repository:** [github.com/AGM82/africa-risk-map](https://github.com/AGM82/africa-risk-map)

## Status

Foundations are in place: Next.js App Router (React 19), Prisma + PostGIS (Neon) with a Row-Level Security pattern, Clerk auth, Sentry, Inngest, Vitest + Playwright, CI, and a Cloud-Run-ready Dockerfile. Domain features (Territory risk register, org/location tracking, policy structure, premium calculator, AI Structure Chat, dashboards) land incrementally per the product plan's remaining to-dos.

Full product/architecture plan: [`.cursor/plans/africa-risk-map-platform-plan.md`](.cursor/plans/africa-risk-map-platform-plan.md)  
Day-to-day agent context: [`.cursor/rules/90-project-context.mdc`](.cursor/rules/90-project-context.mdc)  
Environment variables: [`docs/environment-setup.md`](docs/environment-setup.md)

## Prerequisites

- Node.js 20 (see `.nvmrc`). With [fnm](https://github.com/Schniz/fnm): `fnm use`
- npm (ships with Node)
- A local `.env` — see [`docs/environment-setup.md`](docs/environment-setup.md)

> **Windows PowerShell:** run commands on separate lines (no `&&`).

## Setup

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run build
```

## Commands

| Command              | What it does                           |
| -------------------- | -------------------------------------- |
| `npm run dev`        | Local Next.js dev server               |
| `npm run build`      | Production build (`next build`)        |
| `npm run start`      | Run the production build locally       |
| `npm run typecheck`  | TypeScript, no emit                    |
| `npm run lint`       | ESLint                                 |
| `npm run test`       | Vitest once                            |
| `npm run test:watch` | Vitest watch mode                      |
| `npm run test:e2e`   | Playwright e2e (needs Clerk test keys) |

A change is ready when `typecheck`, `lint`, `test`, and `build` all pass. Prefer feature branches + PRs — `main` is protected and requires CI.

## Guardrails

Scaffolded from [cursor-guardrails](https://github.com/AGM82/cursor-guardrails). Keep a separate **reference clone** of that template and run `/guardrail-upgrade` here when you want template updates. Do not treat this product repo as the template source.

## Out of scope

Claims management, invoicing/payment reconciliation, FAIS/PPR tooling beyond POPIA, and Policy Schedule PDF generation — see the project context file.
