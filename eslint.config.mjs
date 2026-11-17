import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Features are consumed only through their public API (features/<name>/index.ts).
const FEATURE_PUBLIC_API_PATTERN = {
  group: ["@/features/*/*"],
  message: "Import from the feature's public API: '@/features/<name>'.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-imports": ["error", { patterns: [FEATURE_PUBLIC_API_PATTERN] }],
      // Explicit over terse (docs/code-style.md): write the `if`, not `??=` / `||=` / `&&=`.
      "logical-assignment-operators": ["error", "never"],
      "no-nested-ternary": "error",
      eqeqeq: "error",
    },
  },
  // Only `src/app/` composes the admin feature (admin-moderation NFR-4): no other feature and nothing in `shared/`
  // imports it. A later block replaces the rule's options, so the public-API pattern is repeated here.
  {
    files: ["src/features/**/*.{ts,tsx}", "src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            FEATURE_PUBLIC_API_PATTERN,
            {
              group: ["@/features/admin"],
              message: "Only `src/app/` imports the admin feature: route files compose it into the pages.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
  ]),
]);

export default eslintConfig;
