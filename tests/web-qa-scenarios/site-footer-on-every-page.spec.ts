// pages: /, /login, /signup, /authors, /does-not-exist
import { expect, test } from "@playwright/test";

// /authors/<id> is left out: it needs a public profile in the local database.
const SIGNED_OUT_PATHS = ["/", "/login", "/signup", "/authors", "/does-not-exist"] as const;

// Mirrors SITE_FOUNDING_YEAR in src/features/site-footer/model/site-footer.constants.ts: change both together.
const FOUNDING_YEAR = 2026;
const COPYRIGHT_NOTICE = new RegExp(`© ${FOUNDING_YEAR}(–\\d{4})? Поэтический Хаб`);

const FOOTER_LINKS = [
  ["О проекте", "/about"],
  ["Политика конфиденциальности", "/privacy"],
  ["Связаться с нами", "/contact"],
] as const;

// implements FR-1, FR-3, NFR-1 of add-site-footer: one footer after the page content on every page,
// with the copyright notice and the three links in order.
test("the site footer appears once, after main, on every page", { tag: ["@add-site-footer"] }, async ({ page }) => {
  await page.context().clearCookies();

  for (const path of SIGNED_OUT_PATHS) {
    await page.goto(path);

    const footer = page.getByRole("contentinfo");
    await expect(footer).toHaveCount(1);
    await expect(footer).toContainText(COPYRIGHT_NOTICE);

    const footerFollowsMain = await footer.evaluate((footerElement) => {
      const main = document.querySelector("main");
      return main !== null && (main.compareDocumentPosition(footerElement) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    });
    expect(footerFollowsMain).toBe(true);

    const links = footer.getByRole("navigation", { name: "Информация о проекте" }).getByRole("link");
    await expect(links).toHaveCount(FOOTER_LINKS.length);
    for (const [index, [name, href]] of FOOTER_LINKS.entries()) {
      await expect(links.nth(index)).toHaveText(name);
      await expect(links.nth(index)).toHaveAttribute("href", href);
    }
  }
});
