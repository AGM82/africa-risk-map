/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Vitest uses Vite purely as its test-file transformer here — the app itself
// builds and runs on Next.js (see next.config.ts). Kept separate so neither
// tool's config leaks assumptions into the other.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // happy-dom, not jsdom: jsdom's dependency chain (whatwg-url/
    // html-encoding-sniffer -> @exodus/bytes) ships ESM-only files that
    // Vitest's forked worker pool require()s, which breaks on this
    // toolchain (ERR_REQUIRE_ESM). happy-dom implements the same DOM APIs
    // React Testing Library and axe-core need without that dependency chain.
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    exclude: ["**/node_modules/**", "**/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
