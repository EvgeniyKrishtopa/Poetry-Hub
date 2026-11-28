// pages: /login, /signup, /reset-password
import { expect, test } from "@playwright/test";

import { waitForHydration } from "./support/hydration";

const RECOVERY_FAILED_TEXT =
  "Ссылка для восстановления недействительна или устарела. Введите адрес электронной почты и запросите новое письмо.";
const WRONG_CREDENTIALS_TEXT = "Неверный адрес электронной почты или пароль.";
const OFFER_TEXT = "Забыли пароль? Мы можем отправить на этот адрес письмо со ссылкой для восстановления.";
const OFFER_BUTTON = "Отправить письмо";
const SENT_TEXT =
  "Если для этого адреса есть аккаунт, мы отправили письмо со ссылкой для восстановления пароля. Ссылка действует 1 час.";
const DONE_TEXT = "Пароль изменён. Войдите с новым паролем.";
const BACK_TO_SIGN_IN = "Перейти ко входу";
const OFFLINE_TEXT = "Нет подключения к интернету. Сохранение станет доступно, когда связь восстановится.";
const GOOGLE_OFFLINE_TEXT = "Нет подключения к интернету. Вход через Google станет доступен, когда связь восстановится.";
const SIGN_IN_HINT = "Регистрировались через Google? Войдите кнопкой «Войти через Google».";
const SIGN_UP_HINT =
  "Уже регистрировались через Google? Нажмите «Зарегистрироваться через Google»: вы войдёте в тот же аккаунт.";
const SIGN_IN_ATTEMPT_TIMEOUT_MS = 3_000;
const SIGN_IN_TIMEOUT_MS = 20_000;
// An address nobody owns: the answer is the same for it as for any address, and no letter is sent.
const UNKNOWN_ADDRESS = "nobody-recovers-here@example.test";

// None of these needs a real letter: they use a dead link, a wrong password for an unknown address, and the done page.
test.describe("password recovery screens", { tag: ["@password-recovery"] }, () => {
  // implements FR-3, FR-1 of password-recovery
  test("shows the recovery-failed notice and the offer for a dead link", async ({ page }) => {
    await page.goto("/login?error=recovery-failed");

    const main = page.getByRole("main");
    await expect(main.getByRole("alert")).toHaveText(RECOVERY_FAILED_TEXT);
    await expect(main.getByText(OFFER_TEXT)).toBeVisible();
    await expect(main.getByRole("button", { name: OFFER_BUTTON })).toBeVisible();
  });

  // implements FR-1, FR-2 of password-recovery
  test("offers a letter after a wrong password and answers the same for an unknown address", async ({ page }) => {
    await page.goto("/login");
    await waitForHydration(page);
    const main = page.getByRole("main");
    await expect(main.getByRole("button", { name: OFFER_BUTTON })).toHaveCount(0);

    // The sign-in form streams in its own Suspense boundary and hydrates after the body marker is set, so a click
    // can land before it and submit nothing (support/sign-in.ts retries the same way).
    await expect(async () => {
      await main.getByLabel("Электронная почта").fill(UNKNOWN_ADDRESS);
      await main.getByLabel("Пароль").fill("a-wrong-password-1");
      // Exact: the Google button's name also contains the word.
      await main.getByRole("button", { name: "Войти", exact: true }).click();
      await expect(main.getByRole("alert")).toHaveText(WRONG_CREDENTIALS_TEXT, { timeout: SIGN_IN_ATTEMPT_TIMEOUT_MS });
    }).toPass({ timeout: SIGN_IN_TIMEOUT_MS });
    await expect(main.getByText(OFFER_TEXT)).toBeVisible();

    await main.getByRole("button", { name: OFFER_BUTTON }).click();
    await expect(main.getByRole("status").filter({ hasText: SENT_TEXT })).toBeVisible();
    await expect(main.getByLabel("Электронная почта")).toHaveValue(UNKNOWN_ADDRESS);
    await expect(main.getByRole("button", { name: OFFER_BUTTON })).toBeEnabled();
  });

  // implements FR-4 of password-recovery
  test("sends a signed-out /reset-password to the recovery-failed notice", async ({ page }) => {
    await page.goto("/reset-password");

    await expect(page).toHaveURL(/\/login\?error=recovery-failed$/);
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(RECOVERY_FAILED_TEXT);
  });

  // implements FR-6, NFR-2 of password-recovery
  test("shows the done notice and its link without a session, and the notice has focus", async ({ page }) => {
    await page.goto("/reset-password?status=updated");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1, name: "Новый пароль" })).toBeVisible();
    await expect(main.getByRole("status")).toHaveText(DONE_TEXT);
    await expect(main.getByRole("link", { name: BACK_TO_SIGN_IN })).toHaveAttribute("href", "/login");
    await expect(page).toHaveURL(/\/reset-password\?status=updated$/);
    await expect(page.locator(":focus")).toContainText(DONE_TEXT);
  });

  // implements FR-7 of password-recovery
  test("disables the offer button offline beside its own notice, and enables it again online", async ({
    page,
    context,
  }) => {
    await page.goto("/login?error=recovery-failed");
    await waitForHydration(page);
    const main = page.getByRole("main");
    const button = main.getByRole("button", { name: OFFER_BUTTON });
    // The captcha must have passed first: its script cannot load without a connection.
    await expect(button).toBeEnabled();

    await context.setOffline(true);
    await expect(main.getByText(OFFLINE_TEXT)).toBeVisible();
    await expect(main.getByText(GOOGLE_OFFLINE_TEXT)).toBeVisible();
    await expect(button).toBeDisabled();

    await context.setOffline(false);
    await expect(main.getByText(OFFLINE_TEXT)).toBeHidden();
    await expect(button).toBeEnabled();
  });

  // implements FR-14 of password-recovery
  test("shows the Google hint under the Google button on /login and /signup", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("main").getByText(SIGN_IN_HINT)).toBeVisible();

    await page.goto("/signup");
    await expect(page.getByRole("main").getByText(SIGN_UP_HINT)).toBeVisible();
  });
});
