// pages: /login, /account/poems, /account/poems/new, /account/poems/<new poem id>, /account/poems/collections/new, /account/poems/collections/<new collection id>, /account/poems/collections/<new collection id>/poems
import { expect, type Page, test } from "@playwright/test";

import { waitForHydration } from "./support/hydration";
import { signIn } from "./support/sign-in";

/** `author3@example.test` in `supabase/seed.sql`: a public author no other scenario signs in as. */
const EMAIL = "author3@example.test";
const POEM_TEXT = "Строка для проверки сборника.";
const NO_GENRE_LABEL = "Без жанра";

/** Adds a poem through /account/poems/new. */
async function createPoem(page: Page, title: string) {
  const main = page.getByRole("main");
  await page.goto("/account/poems/new");
  await waitForHydration(page);
  await main.getByRole("textbox", { name: "Название произведения" }).fill(title);
  await main.getByRole("textbox", { name: "Текст произведения" }).fill(POEM_TEXT);
  await main.getByLabel("Выберите жанр").selectOption(NO_GENRE_LABEL);
  await main.getByRole("button", { name: "Добавить произведение" }).click();
  await expect(page).toHaveURL(/\/account\/poems\/[0-9a-f-]{36}$/);
}

/** Deletes a poem from its page, reached through the list on /account/poems. */
async function deletePoem(page: Page, title: string) {
  const main = page.getByRole("main");
  await page.goto("/account/poems");
  await waitForHydration(page);
  await main.getByRole("link", { name: title }).click();
  await expect(main.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await waitForHydration(page);
  await main.getByRole("button", { name: "Удалить произведение" }).click();
  await page.getByRole("dialog", { name: "Удалить произведение?" }).getByRole("button", { name: "Удалить", exact: true }).click();
  await expect(main.getByRole("status").filter({ hasText: `Произведение «${title}» удалено.` })).toBeVisible();
}

/** Creates a collection from /account/poems and opens its page; returns the page's URL. */
async function createCollection(page: Page, title: string): Promise<string> {
  const main = page.getByRole("main");
  await page.goto("/account/poems");
  await waitForHydration(page);
  await main.getByRole("link", { name: "Создать сборник произведений" }).click();
  await expect(main.getByRole("heading", { level: 1, name: "Создание сборника" })).toBeVisible();
  await waitForHydration(page);
  await main.getByRole("textbox", { name: "Название сборника" }).fill(title);
  await main.getByRole("button", { name: "Создать сборник" }).click();
  await expect(page).toHaveURL(/\/account\/poems$/);
  await main.getByRole("region", { name: "Сборники произведений" }).getByRole("link", { name: title }).click();
  await expect(page).toHaveURL(/\/account\/poems\/collections\/[0-9a-f-]{36}$/);
  return page.url();
}

/** Deletes the open collection through its page's dialog; ends on /account/poems. */
async function deleteOpenCollection(page: Page, title: string) {
  const main = page.getByRole("main");
  await waitForHydration(page);
  await main.getByRole("button", { name: "Удалить сборник" }).click();
  await page.getByRole("dialog", { name: "Удалить сборник?" }).getByRole("button", { name: "Удалить", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/poems$/);
  await expect(main.getByRole("status").filter({ hasText: `Сборник «${title}» удалён.` })).toBeVisible();
}

/** Presses the collection page's manage button and waits for the poems page. */
async function openCollectionPoems(page: Page) {
  const main = page.getByRole("main");
  await waitForHydration(page);
  await main.getByRole("button", { name: "Произведения сборника" }).click();
  await expect(page).toHaveURL(/\/account\/poems\/collections\/[0-9a-f-]{36}\/poems$/);
  await expect(main.getByRole("heading", { level: 1, name: "Произведения сборника" })).toBeVisible();
  await waitForHydration(page);
}

async function saveSelection(page: Page) {
  const main = page.getByRole("main");
  await main.getByRole("button", { name: "Сохранить выбранное" }).click();
  await expect(main.getByRole("status").filter({ hasText: "Произведения сборника сохранены." })).toBeVisible();
}

// Each run adds its own two poems and two collections and deletes all four, so parallel repeats never touch each
// other's rows and author3 ends as seeded. Every run counts two poem creates (100 per 30 days), two collection
// creates (50 per 30 days), and two saves (10 per minute); `npx supabase db reset` starts the counts over.
// implements FR-1, FR-2, FR-4, FR-5, FR-6, FR-11 of add-poems-to-collections: open → add → save → remove → save,
// then deleting the collection frees its poems.
test(
  "an author adds and removes collection poems, and deleting the collection frees them",
  { tag: ["@add-poems-to-collections"] },
  async ({ page }) => {
    // Unique per run, so parallel repeats never find each other's rows.
    const runId = `${Date.now()}-${test.info().repeatEachIndex}`;
    const kept = `QA стих оставленный ${runId}`;
    const removed = `QA стих убранный ${runId}`;
    const title = `QA сборник стихов ${runId}`;
    const otherTitle = `${title} второй`;
    await signIn(page, EMAIL);
    const main = page.getByRole("main");
    const box = (poem: string) => main.getByRole("checkbox", { name: poem });
    await createPoem(page, removed);
    await createPoem(page, kept);

    // Open → add both → save.
    const collectionUrl = await createCollection(page, title);
    await openCollectionPoems(page);
    await expect(box(kept)).not.toBeChecked();
    await expect(box(removed)).not.toBeChecked();
    await expect(main.getByRole("button", { name: "Сохранить выбранное" })).toHaveCount(0);
    await box(kept).check();
    await box(removed).check();
    await saveSelection(page);

    // Remove one → save.
    await box(removed).uncheck();
    await saveSelection(page);
    await expect(box(kept)).toBeChecked();
    await expect(box(removed)).not.toBeChecked();

    // The collection page lists only the kept poem.
    await main.getByRole("link", { name: "Вернуться к сборнику" }).click();
    await expect(page).toHaveURL(collectionUrl);
    await expect(main.getByRole("link", { name: kept })).toBeVisible();
    await expect(main.getByRole("link", { name: removed })).toHaveCount(0);

    // /account/poems: the kept poem under the collection and in the full list; the removed one in the list only.
    await page.goto("/account/poems");
    const section = main.getByRole("region", { name: "Сборники произведений" });
    await expect(section.getByRole("link", { name: kept })).toBeVisible();
    await expect(main.getByRole("link", { name: kept })).toHaveCount(2);
    await expect(main.getByRole("link", { name: removed })).toHaveCount(1);

    // Deleting the collection keeps its poem, now free: listed once, under no collection.
    await page.goto(collectionUrl);
    await deleteOpenCollection(page, title);
    await expect(main.getByRole("link", { name: title })).toHaveCount(0);
    await expect(main.getByRole("link", { name: kept })).toHaveCount(1);
    await expect(main.getByRole("link", { name: removed })).toHaveCount(1);

    // Another collection offers both poems as free ones, unchecked.
    await createCollection(page, otherTitle);
    await openCollectionPoems(page);
    await expect(box(kept)).not.toBeChecked();
    await expect(box(removed)).not.toBeChecked();

    // Cleanup: the second collection, then both poems.
    await page.goBack();
    await expect(page).toHaveURL(/\/account\/poems\/collections\/[0-9a-f-]{36}$/);
    await deleteOpenCollection(page, otherTitle);
    await deletePoem(page, kept);
    await deletePoem(page, removed);
  },
);
