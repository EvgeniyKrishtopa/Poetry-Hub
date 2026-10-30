// pages: /login, /account/poems/new, /account/poems/<new poem id>, /account/poems
import { expect, test } from "@playwright/test";

import { waitForHydration } from "./support/hydration";
import { signIn } from "./support/sign-in";

/** `author1@example.test` in `supabase/seed.sql`: a public author with no seeded poems. */
const EMAIL = "author1@example.test";
const POEM_TEXT = "Строка для проверки удаления.";
const NO_GENRE_LABEL = "Без жанра";

// Each run creates the poem it deletes, so the scenario leaves no rows behind. Every create still counts
// toward author1's 100-per-30-days limit (ADR 0010); `npx supabase db reset` starts the count over.
// implements FR-1, FR-2, FR-3 of delete-poem: list → poem → delete ends on the list with the one-time notice.
test("an author deletes their own poem from the list → poem path and sees the notice", { tag: ["@delete-poem"] }, async ({ page }) => {
  // Unique per run, so parallel repeats never find each other's poem.
  const title = `QA удаление ${Date.now()}-${test.info().repeatEachIndex}`;
  await signIn(page, EMAIL);

  await page.goto("/account/poems/new");
  await waitForHydration(page);
  const main = page.getByRole("main");
  await main.getByRole("textbox", { name: "Название произведения" }).fill(title);
  await main.getByRole("textbox", { name: "Текст произведения" }).fill(POEM_TEXT);
  await main.getByLabel("Выберите жанр").selectOption(NO_GENRE_LABEL);
  await main.getByRole("button", { name: "Добавить произведение" }).click();
  await expect(page).toHaveURL(/\/account\/poems\/[0-9a-f-]{36}$/);

  // Reach the poem through the list, so /account/poems is a visited route Next can reveal again.
  await page.goto("/account/poems");
  await waitForHydration(page);
  await main.getByRole("link", { name: title }).click();
  await expect(main.getByRole("heading", { level: 1, name: title })).toBeVisible();

  await main.getByRole("button", { name: "Удалить произведение" }).click();
  const dialog = page.getByRole("dialog", { name: "Удалить произведение?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Отмена" })).toBeFocused();
  await dialog.getByRole("button", { name: "Удалить", exact: true }).click();

  await expect(page).toHaveURL(/\/account\/poems$/);
  await expect(main.getByRole("status").filter({ hasText: `Произведение «${title}» удалено.` })).toBeVisible();
  await expect(main.getByRole("link", { name: title })).toHaveCount(0);
});
