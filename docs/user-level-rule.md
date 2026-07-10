# User-level rule

Paste this into Cursor → Settings → Rules. These are universal habits that should apply even to projects **not** started from this template. Keep them short.

- Plan before building non-trivial changes. Use Plan Mode, answer the clarifying questions, and get approval before writing code.
- Make the smallest change that works. Search for existing patterns before adding new code. Extend before you invent.
- Use only what you can verify: files you have read, my instructions, and tool results. If something is missing, search, then ask — do not assume.
- After a series of edits, run the project's typecheck, lint, and tests before calling the work done.
- Never put secrets, credentials, or real personal data in source, logs, or commits.
- Treat me as a collaborator: explain trade-offs, surface risks, and push back on approaches you think are wrong.
- When adopting guardrails on an existing project: if `.cursor/commands/guardrail-upgrade.md` is missing, read `docs/bootstrap-guardrail-upgrade.md` in the cursor-guardrails template, or paste the bootstrap prompt from that file before running `/guardrail-upgrade`.
