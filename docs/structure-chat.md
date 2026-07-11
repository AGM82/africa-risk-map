# Structure Chat

AI-assisted policy schedule drafting. The AI (or fixture drafter) only ever
maps pasted term-sheet text onto the real Policy / CoverCategory / BenefitLine /
PaymentTerms schema. Nothing is real until an Insurer confirms.

## Decisions

- **Drafter port:** `AiStructureDrafter` in `src/lib/structure-chat/drafter.ts`.
  Default/demo/CI uses the deterministic fixture drafter. Live Anthropic runs
  only when `ANTHROPIC_API_KEY` is set (`createDefaultStructureDrafter`).
- **Confirm targets:** Client Policy, reusable `PolicyTemplate`, or both.
- **Access:** Broker may draft for accessible clients; only Insurer may confirm
  a client Policy or save a template. CLIENT role has no access.
- **Paste text only** (no file upload in this slice).
- **Dual benefit scale:** Drafts carry `FIXED_SUM` or `EARNINGS_BASED`, validated
  with the same Zod rules as manual policy create.

## Models

- `PolicyTemplate` — reusable schedule JSON (not client-bound).
- `PolicyStructureSession` — source text, version history, current draft,
  uncertain fields, confirm target and links (Restrict FKs to Policy / Template).

Migration: `prisma/migrations/0008_policy_structure_chat/`.

## UI

Route `/structure-chat` — Describe → Review → Confirm progress. Home card is
hidden from CLIENT users.

## Env

`ANTHROPIC_API_KEY` is optional. When unset, the fixture drafter is used so CI
and local demos stay green without a key. Never send insured-person or payroll
data in prompts — schedule terms only.

## Out of scope

- File/document upload
- Playwright E2E for Structure Chat
- Premium calculator / Endorsements → [`docs/premium-calculator.md`](premium-calculator.md)
- Live Neon migrate deploy
