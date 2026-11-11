// pages: /login, /account/poems, /account/poems/new, /account/poems/<new poem id>, /account/poems/collections/new, /account/poems/collections/<new collection id>, /account/poems/collections/<new collection id>/poems, /authors/10000000-0000-4000-8000-000000000002, /authors/10000000-0000-4000-8000-000000000002/collections/<new collection id>, /authors/10000000-0000-4000-8000-000000000002/poems/<new poem id>
import { expect, type Page, test } from "@playwright/test";

import { waitForHydration } from "./support/hydration";
import { signIn } from "./support/sign-in";

/** `author2@example.test` in `supabase/seed.sql`: a public author whose page no other scenario reads. */
const EMAIL = "author2@example.test";
const AUTHOR_PATH = "/authors/10000000-0000-4000-8000-000000000002";
const POEM_TEXT = "Строка для проверки публичного сборника.";
const NO_GENRE_LABEL = "Без жанра";
const TRAIL_NAME = "Навигационная цепочка";
const NOT_FOUND_HEADING = "Страница не найдена";

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

/** Creates a collection with a description and ends on its owner page, whose address it returns. */
async function createCollection(page: Page, title: string, description: string): Promise<string> {
  const main = page.getByRole("main");
  await page.goto("/account/poems");
  await waitForHydration(page);
  await main.getByRole("link", { name: "Создать сборник произведений" }).click();
  await expect(main.getByRole("heading", { level: 1, name: "Создание сборника" })).toBeVisible();
  await waitForHydration(page);
  await main.getByRole("textbox", { name: "Название сборника" }).fill(title);
  await main.getByRole("textbox", { name: "Описание (необязательно)" }).fill(description);
  await main.getByRole("button", { name: "Создать сборник" }).click();
  await expect(page).toHaveURL(/\/account\/poems$/);
  await main.getByRole("link", { name: title }).click();
  await expect(page).toHaveURL(/\/account\/poems\/collections\/[0-9a-f-]{36}$/);
  return page.url();
}

/** Puts `poem` into the open owner collection through the poems page; ends on the collection page. */
async function addPoemToOpenCollection(page: Page, poem: string) {
  const main = page.getByRole("main");
  await waitForHydration(page);
  await main.getByRole("button", { name: "Произведения сборника" }).click();
  await expect(main.getByRole("heading", { level: 1, name: "Произведения сборника" })).toBeVisible();
  await waitForHydration(page);
  await main.getByRole("checkbox", { name: poem }).check();
  await main.getByRole("button", { name: "Сохранить выбранное" }).click();
  await expect(main.getByRole("status").filter({ hasText: "Произведения сборника сохранены." })).toBeVisible();
}

/** Deletes the open owner collection through its dialog; ends on /account/poems. */
async function deleteOpenCollection(page: Page, title: string) {
  const main = page.getByRole("main");
  await waitForHydration(page);
  await main.getByRole("button", { name: "Удалить сборник" }).click();
  await page.getByRole("dialog", { name: "Удалить сборник?" }).getByRole("button", { name: "Удалить", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/poems$/);
  await expect(main.getByRole("status").filter({ hasText: `Сборник «${title}» удалён.` })).toBeVisible();
}

// Each run adds its own poem and collection and deletes both, so parallel repeats never touch each other's rows and
// author2 ends as seeded. Every run counts one poem create (100 per 30 days), one collection create (50 per 30 days),
// and one save (10 per minute); `npx supabase db reset` starts the counts over.
// implements FR-1, FR-2, FR-5, FR-6, FR-7 of public-collections: a guest sees an author's collection with its poem on
// the author page, opens the collection page by its link, reads the title, description and poem, sees the trail, and
// after the owner deletes the collection the guest's next load shows it gone and its address a 404.
test(
  "a guest sees an author's collection and opens its page",
  { tag: ["@public-collections"] },
  async ({ page, browser }) => {
    // Unique per run, so parallel repeats never find each other's rows.
    const runId = `${Date.now()}-${test.info().repeatEachIndex}`;
    const poem = `QA стих сборника ${runId}`;
    const title = `QA публичный сборник ${runId}`;
    const description = `Описание сборника ${runId}`;

    await signIn(page, EMAIL);
    await createPoem(page, poem);
    const ownerCollectionUrl = await createCollection(page, title, description);
    const collectionId = ownerCollectionUrl.split("/").at(-1) ?? "";
    await addPoemToOpenCollection(page, poem);

    // A guest has no session: a context of its own.
    const guestContext = await browser.newContext();
    const guest = await guestContext.newPage();
    const guestMain = guest.getByRole("main");
    try {
      await guest.goto(AUTHOR_PATH);
      await expect(guestMain.getByRole("heading", { level: 2, name: "Сборники произведений" })).toBeVisible();
      await expect(guestMain.getByRole("link", { name: title })).toBeVisible();
      // The collected poem is listed once, under its collection, and not in the free-poem list.
      await expect(guestMain.getByRole("link", { name: poem })).toHaveCount(1);

      await guestMain.getByRole("link", { name: title }).click();
      await expect(guest).toHaveURL(`${AUTHOR_PATH}/collections/${collectionId}`);
      await expect(guestMain.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(guestMain.getByText(description)).toBeVisible();
      await expect(guestMain.getByRole("link", { name: poem })).toBeVisible();
      // A reader gets no management control, the owner's address of the same collection being another page.
      await expect(guestMain.getByRole("button")).toHaveCount(0);

      const trail = guest.getByRole("navigation", { name: TRAIL_NAME });
      await expect(trail.getByText(title, { exact: true })).toHaveAttribute("aria-current", "page");

      await guestMain.getByRole("link", { name: poem }).click();
      await expect(guestMain.getByRole("heading", { level: 1, name: poem })).toBeVisible();

      // The owner deletes the collection; the guest's next loads follow at once.
      await page.goto(ownerCollectionUrl);
      await deleteOpenCollection(page, title);

      await guest.goto(`${AUTHOR_PATH}/collections/${collectionId}`);
      await expect(guestMain.getByRole("heading", { level: 1, name: NOT_FOUND_HEADING })).toBeVisible();
      await expect(guest.getByRole("navigation", { name: TRAIL_NAME })).toHaveCount(0);
      await guest.goto(AUTHOR_PATH);
      await expect(guestMain.getByRole("link", { name: title })).toHaveCount(0);
      // Freed by the delete, the poem is back in the free-poem list.
      await expect(guestMain.getByRole("link", { name: poem })).toHaveCount(1);
    } finally {
      await guestContext.close();
    }

    await deletePoem(page, poem);
  },
);
