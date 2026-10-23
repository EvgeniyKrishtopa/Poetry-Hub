// pages: /, /about, /privacy
import { expect, test } from "@playwright/test";

const ABOUT_PATH = "/about";
const PRIVACY_PATH = "/privacy";
const HTTP_OK = 200;
const FOOTER_NAV_NAME = "Информация о проекте";
const TRAIL_NAME = "Навигационная цепочка";
const ABOUT_LABEL = "О проекте";
const PRIVACY_LABEL = "Политика конфиденциальности";

// implements FR-5 of add-about-page and FR-5 of add-privacy-policy-page: the footer's ABOUT_LABEL and
// PRIVACY_LABEL links open their pages. Checks the address and the trail, not the CMS text, so it passes
// without Contentful.
test(
  "the footer's about and privacy links open their pages",
  { tag: ["@add-about-page", "@add-privacy-policy-page"] },
  async ({ page }) => {
    const footer = page.getByRole("navigation", { name: FOOTER_NAV_NAME });
    const trail = page.getByRole("navigation", { name: TRAIL_NAME });

    await page.goto("/");
    await footer.getByRole("link", { name: ABOUT_LABEL }).click();
    await expect(page).toHaveURL(ABOUT_PATH);
    await expect(trail.getByText(ABOUT_LABEL)).toHaveAttribute("aria-current", "page");

    await page.goto("/");
    await footer.getByRole("link", { name: PRIVACY_LABEL }).click();
    await expect(page).toHaveURL(PRIVACY_PATH);
    await expect(trail.getByText(PRIVACY_LABEL)).toHaveAttribute("aria-current", "page");

    const aboutResponse = await page.goto(ABOUT_PATH);
    expect(aboutResponse?.status()).toBe(HTTP_OK);
    const privacyResponse = await page.goto(PRIVACY_PATH);
    expect(privacyResponse?.status()).toBe(HTTP_OK);
  },
);
