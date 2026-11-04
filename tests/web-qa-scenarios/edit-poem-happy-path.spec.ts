// pages: /login, /account/poems/new, /account/poems/<new poem id>, /account/poems/<new poem id>/edit, /account/poems
import { expect, type Page, test } from "@playwright/test";

import { waitForHydration } from "./support/hydration";
import { signIn } from "./support/sign-in";

/** `author1@example.test` in `supabase/seed.sql`: a public author with no seeded poems. */
const EMAIL = "author1@example.test";
const NO_GENRE_LABEL = "Без жанра";
const NEW_GENRE_LABEL = "Любовная лирика";
const OWN_POEM_URL = /\/account\/poems\/[0-9a-f-]{36}$/;

/** Creates a poem through the add form and returns its own page's path. */
async function createPoem(page: Page, title: string): Promise<string> {
  await page.goto("/account/poems/new");
  await waitForHydration(page);
  const main = page.getByRole("main");
  await main.getByRole("textbox", { name: "Название произведения" }).fill(title);
  await main.getByRole("textbox", { name: "Текст произведения" }).fill("Строка до правки.");
  await main.getByLabel("Выберите жанр").selectOption(NO_GENRE_LABEL);
  await main.getByRole("button", { name: "Добавить произведение" }).click();
  await expect(page).toHaveURL(OWN_POEM_URL);
  return new URL(page.url()).pathname;
}

/** The restore step: deletes the poem the run created, so the scenario leaves no rows behind. */
async function deletePoem(page: Page, ownPoemPath: string): Promise<void> {
  await page.goto(ownPoemPath);
  await waitForHydration(page);
  await page.getByRole("main").getByRole("button", { name: "Удалить произведение" }).click();
  await page.getByRole("dialog", { name: "Удалить произведение?" }).getByRole("button", { name: "Удалить", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/poems$/);
}

// One save per run against author1's `poem_edit` limit (10 per minute, ADR 0007): three repeats stay under it.
// implements FR-1, FR-4, FR-6 of edit-poem: own poem → edit → save ends on the poem page with the saved notice.
test("an author edits their own poem and sees the saved notice with the new values", { tag: ["@edit-poem"] }, async ({ page }) => {
  // Unique per run, so parallel repeats never find each other's poem.
  const stamp = `${Date.now()}-${test.info().repeatEachIndex}`;
  const newTitle = `QA правка после ${stamp}`;
  const newText = "Строка после правки.";
  await signIn(page, EMAIL);
  const ownPoemPath = await createPoem(page, `QA правка до ${stamp}`);

  await page.goto(ownPoemPath);
  await waitForHydration(page);
  const main = page.getByRole("main");
  await main.getByRole("link", { name: "Редактировать произведение" }).click();
  await expect(page).toHaveURL(new RegExp(`${ownPoemPath}/edit$`));
  await expect(main.getByRole("heading", { level: 1, name: "Редактирование произведения" })).toBeVisible();
  await waitForHydration(page);

  await main.getByRole("textbox", { name: "Название произведения" }).fill(newTitle);
  await main.getByRole("textbox", { name: "Текст произведения" }).fill(newText);
  await main.getByLabel("Выберите жанр").selectOption(NEW_GENRE_LABEL);
  await main.getByRole("button", { name: "Сохранить изменения" }).click();

  await expect(page).toHaveURL(new RegExp(`${ownPoemPath}$`));
  await expect(main.getByRole("status").filter({ hasText: "Изменения сохранены." })).toBeVisible();
  await expect(main.getByRole("heading", { level: 1, name: newTitle })).toBeVisible();
  await expect(main.getByText(newText)).toBeVisible();
  await expect(main.getByText(`Жанр: ${NEW_GENRE_LABEL}`)).toBeVisible();

  await deletePoem(page, ownPoemPath);
});
