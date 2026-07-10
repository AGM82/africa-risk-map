#!/usr/bin/env node
// beforeReadFile guard. Stops the agent from sending secret-bearing files to
// the model. Reads a JSON event on stdin, returns on stdout:
//   { "permission": "allow" | "deny", "user_message"? }
// Configured failClosed in hooks.json: if this crashes, the read is blocked.

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

// Example/template files are safe to read.
const ALLOWLIST = [/\.env\.(example|sample|template)$/i];

// Files that typically hold credentials or private keys.
const SECRET = [
  /(^|[\\/])\.env(\.[^\\/]*)?$/i,
  /\.pem$/i,
  /\.key$/i,
  /\.pfx$/i,
  /\.p12$/i,
  /\.keystore$/i,
  /(^|[\\/])id_(rsa|dsa|ecdsa|ed25519)(\.|$)/i,
  /(^|[\\/])(credentials|secrets?)(\.[^\\/]*)?$/i,
  /(^|[\\/])\.npmrc$/i,
];

const input = await readStdin();
let filePath = "";
try {
  filePath = String(JSON.parse(input).file_path ?? "");
} catch {
  emit({ permission: "allow" });
}

if (ALLOWLIST.some((re) => re.test(filePath))) {
  emit({ permission: "allow" });
}
if (SECRET.some((re) => re.test(filePath))) {
  emit({
    permission: "deny",
    user_message: `Blocked read of a potential secret file: ${filePath}. Secrets must not enter the model context.`,
  });
}
emit({ permission: "allow" });
