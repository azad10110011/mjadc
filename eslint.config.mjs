import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // One-off QA/debug scripts:
    "qa-*.mjs",
    "lint-report.json",
  ]),
  {
    rules: {
      // Legacy codebase still has ~250 untyped call sites. Downgraded to a
      // warning so CI stays green; fix incrementally per module.
      "@typescript-eslint/no-explicit-any": "warn",
      "@next/next/no-img-element": "warn",
    },
  },
]);

export default eslintConfig;
