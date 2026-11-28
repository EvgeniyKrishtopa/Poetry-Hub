// pages: /login
import { expect, test } from "@playwright/test";

// implements FR-2 of add-supabase-auth: wrong credentials show the same message whether or not
// the address is registered. Talks to the real Supabase project from .env.local, so it fails
// on a misconfigured NEXT_PUBLIC_SUPABASE_URL (Supabase then answers 404 and the form shows the
// generic text), and each run spends one sign-in from the rate-limit budget.
test(
  "signing in with a wrong password shows the wrong-credentials alert and keeps the email",
  { tag: ["@add-contact-form", "@google-sign-in"] },
  async ({ page }) => {
    const email = "nobody-qa@example.com";
    await page.goto("/login");
    // Scoped to main: the footer's contact dialog holds a form of its own on every page,
    // with an email field under the same label.
    const main = page.getByRole("main");
    // Enabled only once the form has hydrated and the captcha has passed. (`networkidle` never comes: the widget
    // keeps the network busy.)
    await expect(main.getByRole("button", { name: "Войти", exact: true })).toBeEnabled();
    // One password form, never a doubled one; the Google button is a form of its own beside it.
    await expect(main.locator("form").filter({ has: page.getByLabel("Пароль") })).toHaveCount(1);

    await main.getByLabel("Электронная почта").fill(email);
    await main.getByLabel("Пароль").fill("wrong-password-123");
    // Exact: the Google button's name also contains the word.
    await main.getByRole("button", { name: "Войти", exact: true }).click();

    await expect(main.getByRole("alert")).toHaveText("Неверный адрес электронной почты или пароль.");
    await expect(main.getByLabel("Электронная почта")).toHaveValue(email);
    await expect(main.getByLabel("Пароль")).toHaveValue("");
    await expect(page).toHaveURL("/login");
  },
);
