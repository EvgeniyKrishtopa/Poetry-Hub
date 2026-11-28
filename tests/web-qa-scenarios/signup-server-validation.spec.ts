// pages: /signup
import { expect, test } from "@playwright/test";

// implements FR-4 and NFR-3 of add-supabase-auth: the server schema rejects the input before
// Supabase is called, and each field error is wired to its input.
test(
  "sign-up shows server-side field errors for an invalid email and a short password",
  { tag: ["@add-contact-form", "@google-sign-in"] },
  async ({ page }) => {
    await page.goto("/signup");
    // Scoped to main: the footer's contact dialog holds a form of its own on every page,
    // with an email field under the same label.
    const main = page.getByRole("main");
    // Enabled only once the form has hydrated and the captcha has passed. (`networkidle` never comes: the widget
    // keeps the network busy.)
    await expect(main.getByRole("button", { name: "Зарегистрироваться", exact: true })).toBeEnabled();
    // One password form, never a doubled one; the Google button is a form of its own beside it.
    await expect(main.locator("form").filter({ has: page.getByLabel("Пароль") })).toHaveCount(1);

    await main.getByLabel("Электронная почта").fill("not-an-email");
    await main.getByLabel("Пароль").fill("1234567");
    // Exact: the Google button's name also contains the word.
    await main.getByRole("button", { name: "Зарегистрироваться", exact: true }).click();

    const email = main.getByLabel("Электронная почта");
    const password = main.getByLabel("Пароль");
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(email).toHaveAccessibleDescription("Введите корректный адрес электронной почты.");
    await expect(password).toHaveAttribute("aria-invalid", "true");
    await expect(password).toHaveAccessibleDescription("Не менее 12 символов.");
    await expect(email).toHaveValue("not-an-email");
    await expect(password).toHaveValue("");
  },
);
