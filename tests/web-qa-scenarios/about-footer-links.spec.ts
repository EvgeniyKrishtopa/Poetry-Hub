// pages: /, /about, /privacy
import { expect, test } from "@playwright/test";

const ABOUT_PATH = "/about";
const PRIVACY_PATH = "/privacy";
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const FOOTER_NAV_NAME = "Информация о проекте";
const TRAIL_NAME = "Навигационная цепочка";
const ABOUT_LABEL = "О проекте";
const PRIVACY_LABEL = "Политика конфиденциальности";
const NOT_FOUND_HEADING = "Страница не найдена";

// implements FR-5 of add-about-page: the footer's ABOUT_LABEL link opens the about page and its
// PRIVACY_LABEL link still opens the 404 screen. Checks the address and the trail, not the CMS text,
// so it passes without Contentful.
test("the footer's about link opens the about page, the privacy link the 404 screen", { tag: ["@add-about-page"] }, async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: FOOTER_NAV_NAME }).getByRole("link", { name: ABOUT_LABEL }).click();
  await expect(page).toHaveURL(ABOUT_PATH);
  await expect(page.getByRole("navigation", { name: TRAIL_NAME }).getByText(ABOUT_LABEL)).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.goto("/");
  await page.getByRole("navigation", { name: FOOTER_NAV_NAME }).getByRole("link", { name: PRIVACY_LABEL }).click();
  await expect(page).toHaveURL(PRIVACY_PATH);
  await expect(page.getByRole("heading", { level: 1, name: NOT_FOUND_HEADING })).toBeVisible();

  const aboutResponse = await page.goto(ABOUT_PATH);
  expect(aboutResponse?.status()).toBe(HTTP_OK);
  const privacyResponse = await page.goto(PRIVACY_PATH);
  expect(privacyResponse?.status()).toBe(HTTP_NOT_FOUND);
});
