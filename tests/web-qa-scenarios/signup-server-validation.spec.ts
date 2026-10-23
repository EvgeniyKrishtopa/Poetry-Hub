// pages: /signup
import { expect, test } from "@playwright/test";

// implements FR-4 and NFR-3 of add-supabase-auth: the server schema rejects the input before
// Supabase is called, and each field error is wired to its input.
test(
  "sign-up shows server-side field errors for an invalid email and a short password",
  { tag: ["@add-contact-form"] },
  async ({ page }) => {
    // Wait for hydration: a submit before it hits the form's inert placeholder action.
    await page.goto("/signup", { waitUntil: "networkidle" });
    // Scoped to main: the footer's contact dialog holds a form of its own on every page,
    // with an email field under the same label.
    const main = page.getByRole("main");
    await expect(main.locator("form")).toHaveCount(1);

    await main.getByLabel("Электронная почта").fill("not-an-email");
    await main.getByLabel("Пароль").fill("1234567");
    await main.getByRole("button", { name: "Зарегистрироваться" }).click();

    const email = main.getByLabel("Электронная почта");
    const password = main.getByLabel("Пароль");
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(email).toHaveAccessibleDescription("Введите корректный адрес электронной почты.");
    await expect(password).toHaveAttribute("aria-invalid", "true");
    await expect(password).toHaveAccessibleDescription("Не менее 8 символов.");
    await expect(email).toHaveValue("not-an-email");
    await expect(password).toHaveValue("");
  },
);
