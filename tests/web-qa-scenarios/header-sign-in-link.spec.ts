// pages: /
import { expect, test } from "@playwright/test";

// implements FR-1 of remove-browser-session-read: a signed-out request gets the "Войти" link,
// read on the server and streamed into the header's Suspense boundary.
test(
  "signed-out header shows the Sign in link and no Sign out button",
  { tag: ["@remove-browser-session-read"] },
  async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/");

    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Поэтический Хаб" })).toHaveAttribute("href", "/");
    await expect(header.getByRole("link", { name: "Войти" })).toHaveAttribute("href", "/login");
    await expect(header.getByRole("button", { name: "Выйти" })).toHaveCount(0);
  },
);
