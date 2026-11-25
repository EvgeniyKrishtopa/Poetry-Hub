// pages: /login, /signup, /
import { expect, test } from "@playwright/test";

import { waitForHydration } from "./support/hydration";

const SIGN_IN_LABEL = "Войти через Google";
const SIGN_UP_LABEL = "Зарегистрироваться через Google";
const OFFLINE_TEXT = "Нет подключения к интернету. Вход через Google станет доступен, когда связь восстановится.";
const CANCELLED_TEXT = "Вы отменили вход через Google. Попробуйте ещё раз.";
const BLOCKED_TEXT = "Вход с этим адресом невозможен.";
const ACCOUNT_EXISTS_TEXT = "Аккаунт с этой почтой уже есть — вы вошли в него.";

// None of these needs a Google account: they never press the button while online.
test.describe("Google sign-in buttons and notices", { tag: ["@google-sign-in"] }, () => {
  // implements FR-G1 of google-sign-in
  test("shows the Google button with its separator on /login and /signup", async ({ page }) => {
    await page.goto("/login");
    const loginMain = page.getByRole("main");
    await expect(loginMain.getByRole("button", { name: SIGN_IN_LABEL })).toBeEnabled();
    await expect(loginMain.getByText("или", { exact: true })).toBeVisible();

    await page.goto("/signup");
    await expect(page.getByRole("main").getByRole("button", { name: SIGN_UP_LABEL })).toBeEnabled();
  });

  // implements FR-G2 of google-sign-in
  test("disables the button offline with the Google connection notice, and enables it again online", async ({
    page,
    context,
  }) => {
    await page.goto("/login");
    await waitForHydration(page);
    const main = page.getByRole("main");
    const button = main.getByRole("button", { name: SIGN_IN_LABEL });

    await context.setOffline(true);
    await expect(main.getByText(OFFLINE_TEXT)).toBeVisible();
    await expect(button).toBeDisabled();
    // The password form stays usable offline.
    await expect(main.getByRole("button", { name: "Войти", exact: true })).toBeEnabled();

    await context.setOffline(false);
    await expect(main.getByText(OFFLINE_TEXT)).toBeHidden();
    await expect(button).toBeEnabled();
  });

  // implements FR-G4, FR-G5 of google-sign-in
  test("shows the cancelled notice on /signup and the blocked notice on /login", async ({ page }) => {
    await page.goto("/signup?error=google-cancelled");
    const signupMain = page.getByRole("main");
    await expect(signupMain.getByRole("alert")).toHaveText(CANCELLED_TEXT);
    await expect(signupMain.getByRole("button", { name: SIGN_UP_LABEL })).toBeEnabled();

    await page.goto("/login?error=google-blocked");
    const loginMain = page.getByRole("main");
    await expect(loginMain.getByRole("alert")).toHaveText(BLOCKED_TEXT);
    await expect(loginMain.getByRole("button", { name: SIGN_IN_LABEL })).toBeEnabled();
  });

  // implements FR-G6 of google-sign-in
  test("shows the account-exists notice on / only for its own value", async ({ page }) => {
    await page.goto("/?auth-notice=account-exists");
    await expect(page.getByRole("main").getByRole("status").filter({ hasText: ACCOUNT_EXISTS_TEXT })).toBeVisible();

    await page.goto("/");
    await expect(page.getByText(ACCOUNT_EXISTS_TEXT)).toHaveCount(0);
  });
});
