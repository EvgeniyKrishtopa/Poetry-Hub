// pages: /, /login, /signup, /authors, /does-not-exist
import { expect, test } from "@playwright/test";

// /authors/<id> is left out: it needs a public profile in the local database.
const SIGNED_OUT_PATHS = ["/", "/login", "/signup", "/authors", "/does-not-exist"] as const;

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
    await expect(footer).toContainText(/© 2026(–\d{4})? Поэтический Хаб/);

    const footerFollowsMain = await page.evaluate(() => {
      const main = document.querySelector("main");
      const footer = document.querySelector("footer");
      return main !== null && footer !== null && (main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
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
