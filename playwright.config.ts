import { defineConfig, devices } from "@playwright/test";

// Gate 3 (web-qa) replays the scenarios recorded here before each manual pass (.claude/harness.json webQaScenariosDir).
const SCENARIOS_DIR = "./tests/web-qa-scenarios";
const BASE_URL = "http://localhost:3000";
const DEV_SERVER_STARTUP_TIMEOUT_MS = 120_000;

export default defineConfig({
  testDir: SCENARIOS_DIR,
  use: { baseURL: BASE_URL },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: DEV_SERVER_STARTUP_TIMEOUT_MS,
  },
});
