// pages: /login, /account/poems/new
import { expect, test } from "@playwright/test";

import { waitForHydration } from "./support/hydration";
import { signIn } from "./support/sign-in";

/** `author2@example.test` in `supabase/seed.sql`: a public profile; nothing is created here. */
const EMAIL = "author2@example.test";
const TITLE_MAX_LENGTH = 80;
const TOO_LONG_TITLE = "а".repeat(TITLE_MAX_LENGTH + 1);
/** How long one submit may take to show the errors before it is retried on a not-yet-hydrated form. */
const SUBMIT_ATTEMPT_TIMEOUT_MS = 1_000;

// implements FR-4, NFR-7 of add-poem-creation: field errors at once, tied to their controls, focus on the
// first invalid field, and the text error switching «Просмотр» back to «Редактор».
test("the add form shows tied field errors and moves focus to the first invalid field", {
  tag: ["@add-poem-creation"],
}, async ({ page }) => {
  await signIn(page, EMAIL);
  await page.goto("/account/poems/new");
  await waitForHydration(page);

  const main = page.getByRole("main");
  const title = main.getByLabel("Название произведения");
  const text = main.getByLabel("Текст произведения");
  const genre = main.getByLabel("Выберите жанр");
  const submit = main.getByRole("button", { name: "Добавить произведение" });

  // Wait for the form itself: it streams in its own Suspense boundary, after the body marker.
  await expect(async () => {
    await submit.click();
    await expect(title).toHaveAttribute("aria-invalid", "true", { timeout: SUBMIT_ATTEMPT_TIMEOUT_MS });
  }).toPass();

  for (const control of [title, text, genre]) {
    await expect(control).toHaveAttribute("aria-invalid", "true");
    await expect(control).toHaveAccessibleDescription(/Обязательное поле\./);
  }
  await expect(title).toBeFocused();

  await title.fill(TOO_LONG_TITLE);
  await submit.click();
  await expect(title).toHaveAccessibleDescription(/Не более 80 символов\./);
  await expect(title).toHaveValue(TOO_LONG_TITLE);
  await expect(title).toBeFocused();

  await title.fill("Название");
  await main.getByRole("tab", { name: "Просмотр" }).click();
  await submit.click();
  await expect(main.getByRole("tab", { name: "Редактор" })).toHaveAttribute("aria-selected", "true");
  await expect(text).toBeFocused();
  await expect(page).toHaveURL(/\/account\/poems\/new$/);
});
