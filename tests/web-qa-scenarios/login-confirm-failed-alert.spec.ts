import { expect, test } from "@playwright/test";

const CONFIRM_FAILED_TEXT =
  "Ссылка для подтверждения недействительна или устарела. Войдите или зарегистрируйтесь снова, чтобы получить новую ссылку.";

// implements FR-5 of add-supabase-auth: a failed confirmation link lands on /login with its alert.
test("a failed confirmation link shows the confirm-failed alert on /login", { tag: ["@google-sign-in"] }, async ({ page }) => {
  await page.goto("/login?error=confirm-failed");

  await expect(page.getByRole("main").getByRole("alert")).toHaveText(CONFIRM_FAILED_TEXT);
  // Exact: the Google button's name also contains the word.
  await expect(page.getByRole("button", { name: "Войти", exact: true })).toBeVisible();
});

test("an unknown error value on /login shows no alert", { tag: ["@google-sign-in"] }, async ({ page }) => {
  await page.goto("/login?error=something-else");

  await expect(page.getByRole("button", { name: "Войти", exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert").filter({ hasText: CONFIRM_FAILED_TEXT })).toHaveCount(0);
});
