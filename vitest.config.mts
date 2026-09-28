import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: { modules: { classNameStrategy: "non-scoped" } },
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/index.ts",
        "src/**/*.types.ts",
        // Route composition and async Server Components: Vitest can't render them,
        // so they are covered by browser QA (web-qa) instead.
        "src/app/**",
      ],
      thresholds: {
        statements: 80,
        lines: 80,
        functions: 80,
      },
    },
  },
});
