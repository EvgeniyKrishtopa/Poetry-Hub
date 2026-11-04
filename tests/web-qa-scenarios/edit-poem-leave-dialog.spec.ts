// pages: /login, /account/poems/new, /account/poems/<new poem id>, /account/poems/<new poem id>/edit, /account/poems
import { expect, test } from "@playwright/test";

import { waitForHydration } from "./support/hydration";
import { signIn } from "./support/sign-in";

/** `author1@example.test` in `supabase/seed.sql`: a public author with no seeded poems. */
const EMAIL = "author1@example.test";
const NO_GENRE_LABEL = "Без жанра";
const OWN_POEM_URL = /\/account\/poems\/[0-9a-f-]{36}$/;

// Each run creates the poem it edits and deletes it at the end; nothing is saved, so no edit attempt counts.
// implements FR-13 of edit-poem: a header link on a changed edit form opens the leave dialog and keeps the draft.
test("a header link on a changed edit form opens the unsaved-changes dialog and keeps the draft", { tag: ["@edit-poem"] }, async ({ page }) => {
  const title = `QA уход ${Date.now()}-${test.info().repeatEachIndex}`;
  const draftTitle = `${title} черновик`;
  await signIn(page, EMAIL);

  await page.goto("/account/poems/new");
  await waitForHydration(page);
  const main = page.getByRole("main");
  await main.getByRole("textbox", { name: "Название произведения" }).fill(title);
  await main.getByRole("textbox", { name: "Текст произведения" }).fill("Строка.");
  await main.getByLabel("Выберите жанр").selectOption(NO_GENRE_LABEL);
  await main.getByRole("button", { name: "Добавить произведение" }).click();
  await expect(page).toHaveURL(OWN_POEM_URL);
  const ownPoemPath = new URL(page.url()).pathname;
  const editPath = `${ownPoemPath}/edit`;

  await page.goto(editPath);
  await waitForHydration(page);
  const titleField = main.getByRole("textbox", { name: "Название произведения" });
  await titleField.fill(draftTitle);
  await expect(main.getByRole("button", { name: "Сохранить изменения" })).toBeVisible();

  await page.getByRole("banner").getByRole("link", { name: "Наши авторы" }).click();
  const dialog = page.getByRole("dialog", { name: "Есть несохранённые изменения" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Сначала сохраните изменения.")).toBeVisible();
  const stay = dialog.getByRole("button", { name: "Продолжить редактирование" });
  await expect(stay).toBeFocused();
  await expect(page).toHaveURL(new RegExp(`${editPath}$`));

  await stay.click();
  await expect(dialog).toBeHidden();
  await expect(titleField).toHaveValue(draftTitle);

  // Restore: discard the draft (no leave guard), then delete the poem the run created.
  await main.getByRole("button", { name: "Отменить изменения" }).click();
  await expect(main.getByRole("link", { name: "Вернуться на страницу произведения" })).toBeVisible();
  await page.goto(ownPoemPath);
  await waitForHydration(page);
  await main.getByRole("button", { name: "Удалить произведение" }).click();
  await page.getByRole("dialog", { name: "Удалить произведение?" }).getByRole("button", { name: "Удалить", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/poems$/);
});
