import { expect, test } from "@playwright/test";

const HTTP_OK = 200;

// implements FR-7 of add-route-states: `/` still renders from (public)/page.tsx.
// implements FR-6 of home-page-sections: the hero's greeting is the page's one h1; no poem search box on the page.
// The heading text comes from the CMS (with a static fallback), so only its presence is asserted. The sections
// below the hero hold lists, so what stays true of the home page is the search box and the clear button being gone.
test("home page renders the greeting heading and no poem search", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(HTTP_OK);
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(main.getByRole("searchbox")).toHaveCount(0);
  await expect(main.getByRole("button", { name: "Очистить" })).toHaveCount(0);
});
