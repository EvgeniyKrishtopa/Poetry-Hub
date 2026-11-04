// pages: /login, /account/poems/new, /account/poems/<new poem id>, /account/poems/<new poem id>/edit, /account/poems
import { expect, test } from "@playwright/test";

import { waitForHydration } from "./support/hydration";
import { signIn } from "./support/sign-in";

/** `author1@example.test` in `supabase/seed.sql`: a public author with no seeded poems. */
const EMAIL = "author1@example.test";
const NO_GENRE_LABEL = "Без жанра";
const OWN_POEM_URL = /\/account\/poems\/[0-9a-f-]{36}$/;

// Each run creates the poem it edits and deletes it at the end; nothing is saved, so no edit attempt counts.
// implements FR-12 of edit-poem: the draft survives a link and a Back/Forward round trip; a reload starts fresh.
test("the edit draft is kept over round trips to the poem page and dropped on reload", { tag: ["@edit-poem"] }, async ({ page }) => {
  const title = `QA черновик ${Date.now()}-${test.info().repeatEachIndex}`;
  const draftTitle = `${title} правка`;
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
  const editUrl = new RegExp(`${ownPoemPath}/edit$`);
  const ownPoemUrl = new RegExp(`${ownPoemPath}$`);

  await page.goto(`${ownPoemPath}/edit`);
  await waitForHydration(page);
  const titleField = main.getByRole("textbox", { name: "Название произведения" });
  await titleField.fill(draftTitle);
  const saveButton = main.getByRole("button", { name: "Сохранить изменения" });
  await expect(saveButton).toBeVisible();

  // Round trip by link: the trail's poem link (allowed by the guard), then the edit link back.
  await page.getByRole("navigation", { name: "Навигационная цепочка" }).getByRole("link", { name: title }).click();
  await expect(page).toHaveURL(ownPoemUrl);
  await main.getByRole("link", { name: "Редактировать произведение" }).click();
  await expect(page).toHaveURL(editUrl);
  await expect(titleField).toHaveValue(draftTitle);
  await expect(saveButton).toBeVisible();

  // Round trip by Back and Forward.
  await page.goBack();
  await expect(page).toHaveURL(ownPoemUrl);
  await page.goForward();
  await expect(page).toHaveURL(editUrl);
  await expect(titleField).toHaveValue(draftTitle);

  // A reload asks the browser to confirm leaving; once confirmed, the form opens with the stored values.
  page.once("dialog", (dialog) => void dialog.accept());
  await page.reload();
  await waitForHydration(page);
  await expect(titleField).toHaveValue(title);
  await expect(main.getByRole("link", { name: "Вернуться на страницу произведения" })).toBeVisible();

  // Restore: delete the poem the run created.
  await page.goto(ownPoemPath);
  await waitForHydration(page);
  await main.getByRole("button", { name: "Удалить произведение" }).click();
  await page.getByRole("dialog", { name: "Удалить произведение?" }).getByRole("button", { name: "Удалить", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/poems$/);
});
