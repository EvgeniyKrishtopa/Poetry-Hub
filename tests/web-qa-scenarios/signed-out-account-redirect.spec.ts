// pages: /account, /account/author, /login
import { expect, test } from "@playwright/test";

const TEMPORARY_REDIRECT = 307;
const ACCOUNT_PATHS = ["/account", "/account/author"] as const;

// implements FR-19, FR-1, FR-2, FR-3 of add-author-profiles: the proxy sends a signed-out page request
// for an account path to /login before anything renders, and the header offers «Наши авторы» and Sign in.
test(
  "a signed-out visitor to an account page is redirected to /login by the proxy",
  { tag: ["@add-author-profiles"] },
  async ({ page }) => {
    await page.context().clearCookies();

    for (const path of ACCOUNT_PATHS) {
      const response = await page.request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(TEMPORARY_REDIRECT);
      // The Location may be absolute or relative; only its path matters here.
      const location = new URL(response.headers()["location"] ?? "", response.url());
      expect(location.pathname).toBe("/login");
      expect(location.search).toBe("");
      expect(response.headers()["cache-control"]).toContain("no-store");

      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    }

    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Наши авторы" })).toHaveAttribute("href", "/authors");
    await expect(header.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  },
);
