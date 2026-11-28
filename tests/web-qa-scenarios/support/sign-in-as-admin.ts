import { expect, test, type Page } from "@playwright/test";

import { waitForHydration } from "./hydration";
import { signIn } from "./sign-in";
import { currentTotpCode } from "./totp";

/** `draft-author@example.test`, the seeded admin, and the secret of its seeded factor (`supabase/seed.sql`). */
const ADMIN_EMAIL = "draft-author@example.test";
const ADMIN_TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

/** The app allows 5 codes a minute per account, and the admin scenarios share one: a refused one waits it out. */
const CODE_TIMEOUT_MS = 90_000;
const CODE_ATTEMPT_TIMEOUT_MS = 5_000;
const RETRY_INTERVALS_MS = [1_000, 5_000, 15_000];

/** Signs in the seeded admin with the password and the second factor, and ends on `/admin`. */
export async function signInAsAdmin(page: Page): Promise<void> {
  // The wait for the code limit would not fit the default timeout.
  test.slow();
  await signIn(page, ADMIN_EMAIL);
  await page.goto("/admin/verify");
  await waitForHydration(page);
  const main = page.getByRole("main");
  const field = main.getByLabel("Код из приложения");
  const submit = main.getByRole("button", { name: "Подтвердить" });
  await expect(async () => {
    await expect(submit).toBeEnabled();
    const code = currentTotpCode(ADMIN_TOTP_SECRET);
    await field.fill(code);
    await submit.click();
    await expect(page).toHaveURL(/\/admin$/, { timeout: CODE_ATTEMPT_TIMEOUT_MS });
  }).toPass({ timeout: CODE_TIMEOUT_MS, intervals: RETRY_INTERVALS_MS });
}
