import { expect, test } from "@playwright/test";

const HTTP_NOT_FOUND = 404;

// implements FR-1 of add-route-states: unknown URL → 404 screen → link back home.
test("unknown URL shows the 404 screen and links back home", async ({ page }) => {
  const response = await page.goto("/does-not-exist");

  expect(response?.status()).toBe(HTTP_NOT_FOUND);
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();

  await page.getByRole("link", { name: "Back to the home page" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
