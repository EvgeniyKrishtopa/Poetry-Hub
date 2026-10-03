import { expect, test } from "@playwright/test";

// implements FR-4 and NFR-3 of add-supabase-auth: the server schema rejects the input before
// Supabase is called, and each field error is wired to its input.
test("sign-up shows server-side field errors for an invalid email and a short password", async ({ page }) => {
  // Wait for hydration: a submit before it hits the form's inert placeholder action.
  await page.goto("/signup", { waitUntil: "networkidle" });
  await expect(page.locator("form")).toHaveCount(1);

  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password").fill("1234567");
  await page.getByRole("button", { name: "Create account" }).click();

  const email = page.getByLabel("Email");
  const password = page.getByLabel("Password");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAccessibleDescription("Enter a valid email address.");
  await expect(password).toHaveAttribute("aria-invalid", "true");
  await expect(password).toHaveAccessibleDescription("Use at least 8 characters.");
  await expect(email).toHaveValue("not-an-email");
  await expect(password).toHaveValue("");
});
