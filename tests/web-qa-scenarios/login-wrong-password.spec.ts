// pages: /login
import { expect, test } from "@playwright/test";

// implements FR-2 of add-supabase-auth: wrong credentials show the same message whether or not
// the address is registered. Talks to the real Supabase project from .env.local, so it fails
// on a misconfigured NEXT_PUBLIC_SUPABASE_URL (Supabase then answers 404 and the form shows the
// generic text), and each run spends one sign-in from the rate-limit budget.
test(
  "signing in with a wrong password shows the wrong-credentials alert and keeps the email",
  { tag: ["@add-contact-form"] },
  async ({ page }) => {
    const email = "nobody-qa@example.com";
    // Wait for hydration: a submit before it hits the form's inert placeholder action.
    await page.goto("/login", { waitUntil: "networkidle" });
    // Scoped to main: the footer's contact dialog holds a form of its own on every page,
    // with an email field under the same label.
    const main = page.getByRole("main");
    await expect(main.locator("form")).toHaveCount(1);

    await main.getByLabel("Электронная почта").fill(email);
    await main.getByLabel("Пароль").fill("wrong-password-123");
    await main.getByRole("button", { name: "Войти" }).click();

    await expect(main.getByRole("alert")).toHaveText("Неверный адрес электронной почты или пароль.");
    await expect(main.getByLabel("Электронная почта")).toHaveValue(email);
    await expect(main.getByLabel("Пароль")).toHaveValue("");
    await expect(page).toHaveURL("/login");
  },
);
