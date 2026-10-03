import { expect, test } from "@playwright/test";

const CONFIRM_FAILED_TEXT =
  "That confirmation link is invalid or has expired. Sign in, or sign up again to get a new link.";

// implements FR-5 of add-supabase-auth: a failed confirmation link lands on /login with its alert.
test("a failed confirmation link shows the confirm-failed alert on /login", async ({ page }) => {
  await page.goto("/login?error=confirm-failed");

  await expect(page.getByRole("main").getByRole("alert")).toHaveText(CONFIRM_FAILED_TEXT);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("an unknown error value on /login shows no alert", async ({ page }) => {
  await page.goto("/login?error=something-else");

  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert").filter({ hasText: CONFIRM_FAILED_TEXT })).toHaveCount(0);
});
