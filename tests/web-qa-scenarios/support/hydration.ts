import type { Page } from "@playwright/test";

/** Call after every page.goto / full navigation, before the first fill or click on a form. */
export async function waitForHydration(page: Page): Promise<void> {
  await page.locator('body[data-hydrated="true"]').waitFor({ state: "attached" });
}
