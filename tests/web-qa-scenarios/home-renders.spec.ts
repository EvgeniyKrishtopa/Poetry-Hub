import { expect, test } from "@playwright/test";

const HTTP_OK = 200;

// implements FR-7 of add-route-states: `/` still renders from (public)/page.tsx.
// implements FR-9 of add-author-poems: the greeting banner is the page's only content.
// The heading text comes from the CMS (with a static fallback), so only its presence is asserted.
test("home page renders the greeting heading and no poem list", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(HTTP_OK);
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(main.getByRole("list")).toHaveCount(0);
});
