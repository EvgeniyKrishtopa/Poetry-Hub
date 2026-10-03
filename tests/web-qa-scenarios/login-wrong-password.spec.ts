import { expect, test } from "@playwright/test";

// implements FR-2 of add-supabase-auth: wrong credentials show the same message whether or not
// the address is registered. Talks to the real Supabase project from .env.local, so it fails
// on a misconfigured NEXT_PUBLIC_SUPABASE_URL (Supabase then answers 404 and the form shows the
// generic text), and each run spends one sign-in from the rate-limit budget.
test("signing in with a wrong password shows the wrong-credentials alert and keeps the email", async ({
  page,
}) => {
  const email = "nobody-qa@example.com";
  // Wait for hydration: a submit before it hits the form's inert placeholder action.
  await page.goto("/login", { waitUntil: "networkidle" });
  await expect(page.locator("form")).toHaveCount(1);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("wrong-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Incorrect email or password.");
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await expect(page.getByLabel("Password")).toHaveValue("");
  await expect(page).toHaveURL("/login");
});
