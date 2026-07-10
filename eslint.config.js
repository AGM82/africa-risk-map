import js from "@eslint/js";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import security from "eslint-plugin-security";

// Flat config (ESLint 9). If a plugin's flat-config export name differs in the
// version you resolve, adjust the imports below — see README "Notes".
export default tseslint.config(
  { ignores: ["dist", "build", ".next", "coverage", "node_modules", ".cursor/**"] },
  js.configs.recommended,
  // Type-checked rules are expensive and only meaningful for TS source, so we
  // scope them to .ts/.tsx. Plain JS/ESM (config files, hook scripts) is handled
  // by the Node block below.
  {
    files: ["**/*.{ts,tsx}"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "jsx-a11y": jsxA11y,
      security,
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      ...security.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // Node-context JS/ESM: build config files and Cursor hook scripts.
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
      },
    },
  },
);
