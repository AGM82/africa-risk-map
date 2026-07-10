#!/usr/bin/env node
// beforeShellExecution guard.
// Reads a JSON event on stdin, returns a permission decision on stdout:
//   { "permission": "allow" | "deny" | "ask", "user_message"?, "agent_message"? }
// Fail-open by design (see hooks.json failClosed); a bug here must never lock
// you out of running commands. Tune the patterns to your environment.

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(data));
  });
}

function emit(decision) {
  process.stdout.write(JSON.stringify(decision));
  process.exit(0);
}

// Hard blocks — destructive, effectively irreversible operations.
const DENY = [
  { re: /\brm\s+-[a-z]*r[a-z]*f[a-z]*\b[^\n]*(\s\/(\s|$)|\s\/\*|\s~(\s|\/|$)|\$HOME)/i, msg: "recursive force-delete of a root or home path" },
  { re: /\bmkfs(\.|\b)/i, msg: "filesystem format command" },
  { re: /\bdd\b[^|\n]*\bof=\/dev\//i, msg: "raw write to a block device" },
  { re: />\s*\/dev\/sd[a-z]/i, msg: "redirect over a raw disk device" },
  { re: /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;/, msg: "fork bomb" },
  { re: /\bchmod\s+-R\s+0?777\s+\//i, msg: "world-writable permissions on a root path" },
  { re: /\bgit\s+push\b[^\n]*(--force(?!-with-lease)\b|\s-f\b)/i, msg: "force push (rewrites shared history)" },
  { re: /\bnpm\s+publish\b/i, msg: "npm publish requires explicit human approval — run manually" },
];

// Soft gates — let the human decide.
const ASK = [
  { re: /\bgit\s+push\b(?![^\n]*(--force(?!-with-lease)|\s-f\b))[^\n]*\b(main|master|release|production)\b/i, msg: "pushing directly to a protected branch" },
  { re: /\bgit\s+reset\s+--hard\b/i, msg: "git reset --hard discards uncommitted work" },
  { re: /\bgit\s+clean\s+-[a-z]*f/i, msg: "git clean -f deletes untracked files" },
  { re: /\b(curl|wget)\b[^\n]*\|\s*(sudo\s+)?(ba)?sh\b/i, msg: "piping a downloaded script straight into a shell" },
  { re: /\bsudo\b/i, msg: "elevated privileges requested" },
];

const input = await readStdin();
let command = "";
try {
  command = String(JSON.parse(input).command ?? "");
} catch {
  emit({ permission: "allow" });
}

for (const rule of DENY) {
  if (rule.re.test(command)) {
    emit({
      permission: "deny",
      user_message: `Blocked by guardrail: ${rule.msg}.`,
      agent_message: `This command was blocked by .cursor/hooks/guard-shell.mjs (${rule.msg}). Use a safer approach, or ask the user to run it manually.`,
    });
  }
}
for (const rule of ASK) {
  if (rule.re.test(command)) {
    emit({
      permission: "ask",
      user_message: `Approval needed: ${rule.msg}.`,
      agent_message: `This command needs explicit user approval (${rule.msg}).`,
    });
  }
}
emit({ permission: "allow" });
