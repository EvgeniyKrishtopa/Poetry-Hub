import { expect, type Page } from "@playwright/test";

import { waitForHydration } from "./hydration";

/** The shared password of every local seed account (`supabase/seed.sql`). */
const SEED_PASSWORD = "local-seed-password";

/** Bounds the sign-in retry below; one retry is the usual case. */
const SIGN_IN_TIMEOUT_MS = 20_000;
/** How long one sign-in attempt may take to leave /login before it is retried. */
const SIGN_IN_ATTEMPT_TIMEOUT_MS = 3_000;

/** Signs in a local seed account through the /login form and waits until the page leaves /login. */
export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await waitForHydration(page);
  const main = page.getByRole("main");
  // The sign-in form streams in its own Suspense boundary and hydrates after the body marker is set,
  // so a fill can land before it and be wiped; retry until the submit leaves /login.
  await expect(async () => {
    await main.getByLabel("Электронная почта").fill(email);
    await main.getByLabel("Пароль").fill(SEED_PASSWORD);
    await main.getByRole("button", { name: "Войти" }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: SIGN_IN_ATTEMPT_TIMEOUT_MS });
  }).toPass({ timeout: SIGN_IN_TIMEOUT_MS });
}
