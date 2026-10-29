// pages: /account/poems, /account/poems/new, /account/poems/30000000-0000-4000-8000-000000000051, /login
import { expect, test } from "@playwright/test";

const TEMPORARY_REDIRECT = 307;
/** The seed's fixed id for author5's first poem: an existing poem must redirect a guest too. */
const SEEDED_POEM_ID = "30000000-0000-4000-8000-000000000051";
const MANAGEMENT_PATHS = ["/account/poems", "/account/poems/new", `/account/poems/${SEEDED_POEM_ID}`] as const;

// implements FR-2, FR-3, FR-7 of add-poem-creation: a signed-out request for a management page is
// redirected to /login by the proxy, and no management content renders.
test(
  "a signed-out visitor to a poem management page is redirected to /login",
  { tag: ["@add-poem-creation"] },
  async ({ page }) => {
    await page.context().clearCookies();

    for (const path of MANAGEMENT_PATHS) {
      const response = await page.request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(TEMPORARY_REDIRECT);
      // The Location may be absolute or relative; only its path matters here.
      const location = new URL(response.headers()["location"] ?? "", response.url());
      expect(location.pathname).toBe("/login");

      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("main").getByRole("heading", { name: "Ваши Произведения" })).toHaveCount(0);
      await expect(page.getByRole("main").getByRole("heading", { name: "Добавление нового произведения" })).toHaveCount(0);
    }
  },
);
