// pages: /admin, /login, /
import { expect, test } from "@playwright/test";

import { signIn } from "./support/sign-in";

/** `author1@example.test` in `supabase/seed.sql`: a signed-in reader who is not an admin. */
const READER_EMAIL = "author1@example.test";
/** `draft-author@example.test`: the seeded admin. */
const ADMIN_EMAIL = "draft-author@example.test";
const ADMIN_LINK = "Админка";
const NOT_FOUND_HEADING = "Страница не найдена";

// implements FR-2, FR-20 of admin-moderation
test("a signed-out visitor to /admin is sent to /login", { tag: ["@admin-moderation"] }, async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

// implements FR-2, FR-20 of admin-moderation
test("a signed-in non-admin gets the not-found page and no admin link", { tag: ["@admin-moderation"] }, async ({ page }) => {
  await signIn(page, READER_EMAIL);
  await expect(page.getByRole("banner").getByRole("link", { name: ADMIN_LINK })).toHaveCount(0);

  await page.goto("/admin");
  await expect(page.getByRole("main").getByRole("heading", { name: NOT_FOUND_HEADING })).toBeVisible();
});

// implements FR-2, FR-20 of admin-moderation
test("the admin sees the header link and the user list", { tag: ["@admin-moderation"] }, async ({ page }) => {
  await signIn(page, ADMIN_EMAIL);
  await page.getByRole("banner").getByRole("link", { name: ADMIN_LINK }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("main").getByText(READER_EMAIL, { exact: true })).toBeVisible();
});
