import { expect, test } from "@playwright/test";

const HTTP_OK = 200;

// implements FR-7 of add-route-states: `/` still renders from (public)/page.tsx.
// The heading text comes from the CMS (with a static fallback), so only its presence is asserted.
test("home page renders the greeting heading and the poem list", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(HTTP_OK);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // At least one poem rendered inside the page content, not just any list (e.g. a future nav).
  await expect(page.getByRole("main").getByRole("listitem").first()).toBeVisible();
});
