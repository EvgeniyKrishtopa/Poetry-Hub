import { defineConfig, devices } from "@playwright/test";

// Gate 3 (web-qa) replays the scenarios recorded here before each manual pass (.claude/harness.json webQaScenariosDir).
const SCENARIOS_DIR = "./tests/web-qa-scenarios";
const RESTRICTING_SCENARIOS = [
  "**/admin-warns-and-blocks-from-review-list.spec.ts",
  "**/admin-add-control-on-collection-and-narrow-screens.spec.ts",
];
// Each of these fills and empties the home page's two chosen lists, which every visitor and every other scenario
// shares: two of them at the same time wipe each other's entries. Playwright runs the files of one project in
// parallel, so each gets a project of its own, chained one after the other.
const HOME_LIST_SCENARIOS = [
  "**/admin-chooses-reorders-removes-home-entries.spec.ts",
  "**/home-sections.spec.ts",
  "**/home-featured-order-on-page.spec.ts",
];
const HOME_LIST_PROJECT_PREFIX = "home-lists-";
const ALL_RESTRICTED_SCENARIOS = [...RESTRICTING_SCENARIOS, ...HOME_LIST_SCENARIOS];
const BASE_URL = "http://localhost:3000";
const DEV_SERVER_STARTUP_TIMEOUT_MS = 120_000;
// Cloudflare's published always-pass test keys, matching the local stack's `[auth.captcha]` secret: not secrets.
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

export default defineConfig({
  testDir: SCENARIOS_DIR,
  use: { baseURL: BASE_URL },
  projects: [
    { name: "chromium", testIgnore: ALL_RESTRICTED_SCENARIOS, use: { ...devices["Desktop Chrome"] } },
    // Scenarios that block a seeded user for a moment (which would sign other scenarios out of that account) or add
    // a collection to an author whose lists others read run after the rest, so nothing else is using those accounts
    // or reading those lists.
    {
      name: "restricting",
      testMatch: RESTRICTING_SCENARIOS,
      dependencies: ["chromium"],
      use: { ...devices["Desktop Chrome"] },
    },
    // The scenarios that fill the home page's chosen lists run last, one at a time.
    ...HOME_LIST_SCENARIOS.map((testMatch, index) => ({
      name: `${HOME_LIST_PROJECT_PREFIX}${index + 1}`,
      testMatch,
      dependencies: [index === 0 ? "restricting" : `${HOME_LIST_PROJECT_PREFIX}${index}`],
      use: { ...devices["Desktop Chrome"] },
    })),
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    // An empty key makes every send fail as `config`, so no scenario mails a seed address (`*.example.test`) for real.
    // The Turnstile test keys let the forms pass their check whatever `.env.local` holds.
    // All of it applies only when Playwright starts the server: an already-running dev server keeps its own environment.
    env: {
      RESEND_API_KEY: "",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: TURNSTILE_TEST_SITE_KEY,
      TURNSTILE_SECRET_KEY: TURNSTILE_TEST_SECRET_KEY,
    },
    reuseExistingServer: true,
    timeout: DEV_SERVER_STARTUP_TIMEOUT_MS,
  },
});
