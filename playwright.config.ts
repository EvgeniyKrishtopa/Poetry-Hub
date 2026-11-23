import { defineConfig, devices } from "@playwright/test";

// Gate 3 (web-qa) replays the scenarios recorded here before each manual pass (.claude/harness.json webQaScenariosDir).
const SCENARIOS_DIR = "./tests/web-qa-scenarios";
const RESTRICTING_SCENARIOS = [
  "**/admin-warns-and-blocks-from-review-list.spec.ts",
  "**/admin-add-control-on-collection-and-narrow-screens.spec.ts",
  "**/admin-chooses-reorders-removes-home-entries.spec.ts",
];
const BASE_URL = "http://localhost:3000";
const DEV_SERVER_STARTUP_TIMEOUT_MS = 120_000;

export default defineConfig({
  testDir: SCENARIOS_DIR,
  use: { baseURL: BASE_URL },
  projects: [
    { name: "chromium", testIgnore: RESTRICTING_SCENARIOS, use: { ...devices["Desktop Chrome"] } },
    // Scenarios that block a seeded user for a moment (which would sign other scenarios out of that account) or add
    // a collection to an author whose lists others read, or fill the home page's chosen lists, run after the rest, so
    // nothing else is using those accounts or reading those lists.
    {
      name: "restricting",
      testMatch: RESTRICTING_SCENARIOS,
      dependencies: ["chromium"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    // An empty key makes every send fail as `config`, so no scenario mails a seed address (`*.example.test`) for real.
    // It only applies when Playwright starts the server: an already-running dev server keeps its own environment.
    env: { RESEND_API_KEY: "" },
    reuseExistingServer: true,
    timeout: DEV_SERVER_STARTUP_TIMEOUT_MS,
  },
});
