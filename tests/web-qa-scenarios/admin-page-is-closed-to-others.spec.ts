// pages: /admin, /login, /
import { expect, test } from "@playwright/test";

import { signIn } from "./support/sign-in";

/** `author1@example.test` in `supabase/seed.sql`: a signed-in reader who is not an admin. */
const READER_EMAIL = "author1@example.test";
/** `draft-author@example.test`: the seeded admin. */
const ADMIN_EMAIL = "draft-author@example.test";
const ADMIN_LINK = "Админка";
const NOT_FOUND_HEADING = "Страница не найдена";
/** The breadcrumb landmark's label (`BREADCRUMBS_LANDMARK_LABEL`) and its first item. */
const TRAIL_LABEL = "Навигационная цепочка";
const HOME_CRUMB = "Главная";

// implements FR-2, FR-20 of admin-moderation
test("a signed-out visitor to /admin is sent to /login", { tag: ["@admin-moderation"] }, async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

// implements FR-2, FR-20, FR-21 of admin-moderation
test("a signed-in non-admin gets the not-found page, no admin link and no trail", { tag: ["@admin-moderation"] }, async ({ page }) => {
  await signIn(page, READER_EMAIL);
  await expect(page.getByRole("banner").getByRole("link", { name: ADMIN_LINK })).toHaveCount(0);

  await page.goto("/admin");
  await expect(page.getByRole("main").getByRole("heading", { name: NOT_FOUND_HEADING })).toBeVisible();
  // FR-21: the page does not announce itself, so no trail either. The slot streams in its own boundary, so let it settle first.
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("navigation", { name: TRAIL_LABEL })).toHaveCount(0);
});

// implements FR-2, FR-20, FR-21, FR-3 of admin-moderation
test("the admin sees the header link, the trail and the user list without any admin", { tag: ["@admin-moderation"] }, async ({ page }) => {
  await signIn(page, ADMIN_EMAIL);
  await page.getByRole("banner").getByRole("link", { name: ADMIN_LINK }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("main").getByText(READER_EMAIL, { exact: true })).toBeVisible();

  const trail = page.getByRole("navigation", { name: TRAIL_LABEL });
  await expect(trail.getByRole("link", { name: HOME_CRUMB })).toBeVisible();
  await expect(trail.getByText(ADMIN_LINK, { exact: true })).toBeVisible();
  await expect(trail.getByRole("link", { name: ADMIN_LINK })).toHaveCount(0);

  // FR-3: admins are not listed, the signed-in admin included.
  await expect(page.getByRole("main").getByText(ADMIN_EMAIL, { exact: true })).toHaveCount(0);
});
