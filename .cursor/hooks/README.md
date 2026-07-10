# Cursor hooks

These scripts are invoked by Cursor at agent lifecycle events, configured in `.cursor/hooks.json`. They implement runtime guardrails that cannot be bypassed by AI agent instructions.

## Hook scripts

| File              | Event                                                  | Purpose                                           |
| ----------------- | ------------------------------------------------------ | ------------------------------------------------- |
| `guard-shell.mjs` | `beforeShellExecution`                                 | DENY/ASK gate on destructive shell commands       |
| `guard-read.mjs`  | `beforeFileRead`                                       | Blocks reads of sensitive paths (`.env`, secrets) |
| `audit.mjs`       | `afterShellExecution`, `afterFileEdit`, `sessionStart` | Structured audit log for traceability             |

## Audit log schema

`audit.mjs` appends one JSON record per event to `.cursor/hooks/logs/agent-audit.log` (git-ignored).

Each record follows this schema (OWASP ASVS V7.1 — event logging requirements):

```json
{
  "timestamp": "2026-06-30T19:00:00.000Z",
  "hookEvent": "afterShellExecution",
  "actor": "cursor-agent",
  "command": "npm run typecheck",
  "file": null,
  "outcome": "ok",
  "sha": "a1b2c3d"
}
```

| Field       | Type                               | Description                                        |
| ----------- | ---------------------------------- | -------------------------------------------------- |
| `timestamp` | ISO-8601 string                    | When the event was logged                          |
| `hookEvent` | string                             | Cursor hook event name                             |
| `actor`     | string                             | Always `"cursor-agent"` for agent-triggered events |
| `command`   | string \| null                     | Shell command, if applicable (capped at 500 chars) |
| `file`      | string \| null                     | File path, if applicable (capped at 300 chars)     |
| `outcome`   | `"ok"` \| `"error"` \| `"unknown"` | Normalised result                                  |
| `sha`       | string \| null                     | Git HEAD SHA at time of event                      |

## Retention

The log is local and git-ignored. It exists for session-level traceability, not long-term storage. Rotate or clear it manually as needed. Real projects that require durable audit trails should ship logs to a centralised sink (e.g. a logging service) rather than relying on this local file.

## Self-test

CI runs `node .cursor/hooks/audit.mjs --self-test` to verify the hook is syntactically valid and emits a record matching the expected schema. This gate means a broken audit hook fails CI rather than silently dropping events.
