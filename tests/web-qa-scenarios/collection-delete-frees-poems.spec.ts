// pages: /login, /account/poems, /account/poems/new, /account/poems/<new poem id>, /account/poems/collections/new, /account/poems/collections/<new collection id>, /account/poems/collections/<new collection id>/poems
import { expect, type Page, test } from "@playwright/test";

import { waitForHydration } from "./support/hydration";
import { signIn } from "./support/sign-in";

/** `author4@example.test` in `supabase/seed.sql`: a public author no other scenario signs in as. */
const EMAIL = "author4@example.test";
const POEM_TEXT = "Строка для проверки свободных произведений.";
const NO_GENRE_LABEL = "Без жанра";
const SECTION_NAME = "Сборники произведений";

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

/** Creates a collection holding `poem` and ends on /account/poems. */
async function createCollectionWith(page: Page, title: string, poem: string) {
  const main = page.getByRole("main");
  await page.goto("/account/poems");
  await waitForHydration(page);
  await main.getByRole("link", { name: "Создать сборник произведений" }).click();
  await expect(main.getByRole("heading", { level: 1, name: "Создание сборника" })).toBeVisible();
  await waitForHydration(page);
  await main.getByRole("textbox", { name: "Название сборника" }).fill(title);
  await main.getByRole("button", { name: "Создать сборник" }).click();
  await expect(page).toHaveURL(/\/account\/poems$/);
  await main.getByRole("region", { name: SECTION_NAME }).getByRole("link", { name: title }).click();
  await expect(page).toHaveURL(/\/account\/poems\/collections\/[0-9a-f-]{36}$/);
  await waitForHydration(page);
  await main.getByRole("button", { name: "Произведения сборника" }).click();
  await expect(main.getByRole("heading", { level: 1, name: "Произведения сборника" })).toBeVisible();
  await waitForHydration(page);
  await main.getByRole("checkbox", { name: poem }).check();
  await main.getByRole("button", { name: "Сохранить выбранное" }).click();
  await expect(main.getByRole("status").filter({ hasText: "Произведения сборника сохранены." })).toBeVisible();
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

// Each run adds its own three poems and two collections and deletes all five, so parallel repeats never touch each
// other's rows and author4 ends as seeded. Every run counts three poem creates (100 per 30 days), two collection
// creates (50 per 30 days), and two saves (10 per minute); `npx supabase db reset` starts the counts over.
// implements FR-1, FR-3 of show-only-free-poems: deleting a collection moves its poems into the free-poem list, also
// after Back and Forward, while another collection's poem stays out of it.
// implements FR-10 of drag-and-drop-ordering: the freed poems go first among the free poems, ahead of `free`.
test(
  "deleting a collection moves its poems into the free-poem list",
  { tag: ["@show-only-free-poems"] },
  async ({ page }) => {
    // Unique per run, so parallel repeats never find each other's rows.
    const runId = `${Date.now()}-${test.info().repeatEachIndex}`;
    const freed = `QA стих из удалённого ${runId}`;
    const free = `QA стих свободный ${runId}`;
    const kept = `QA стих в другом сборнике ${runId}`;
    const deletedTitle = `QA сборник удаляемый ${runId}`;
    const keptTitle = `QA сборник остающийся ${runId}`;
    await signIn(page, EMAIL);
    const main = page.getByRole("main");
    const section = main.getByRole("region", { name: SECTION_NAME });
    // The free-poem list follows the section, so it is the last list on the page.
    const freeList = main.getByRole("list").last();

    await createPoem(page, freed);
    await createPoem(page, free);
    await createPoem(page, kept);
    await createCollectionWith(page, deletedTitle, freed);
    await createCollectionWith(page, keptTitle, kept);

    // Before the delete: collected poems only under their collection.
    await page.goto("/account/poems");
    await expect(section.getByRole("link", { name: freed })).toBeVisible();
    await expect(main.getByRole("link", { name: freed })).toHaveCount(1);
    await expect(freeList.getByRole("link", { name: free })).toBeVisible();

    // Delete from the collection page, reached by its link.
    await section.getByRole("link", { name: deletedTitle }).click();
    await expect(page).toHaveURL(/\/account\/poems\/collections\/[0-9a-f-]{36}$/);
    const deletedUrl = page.url();
    await deleteOpenCollection(page, deletedTitle);

    /** The page after the delete: the freed poem first in the free list, before `free`; `kept` only under its collection. */
    async function expectFreedInList() {
      await expect(page).toHaveURL(/\/account\/poems$/);
      await expect(main.getByRole("link", { name: deletedTitle })).toHaveCount(0);
      await expect(section.getByRole("link", { name: keptTitle })).toBeVisible();
      await expect(section.getByRole("link", { name: kept })).toBeVisible();
      await expect(main.getByRole("link", { name: kept })).toHaveCount(1);
      await expect(main.getByRole("link", { name: freed })).toHaveCount(1);
      const ours = freeList.getByRole("link").filter({ hasText: runId });
      await expect(ours).toHaveText([freed, free]);
    }
    await expectFreedInList();

    // Back, then Forward: every /account/poems reached is fresh.
    await page.goBack();
    await expectFreedInList();
    await page.goForward();
    await expectFreedInList();

    // The old address is gone.
    await page.goto(deletedUrl);
    await expect(main.getByRole("heading", { level: 1, name: "Страница не найдена" })).toBeVisible();

    // Cleanup: the other collection, then the three poems.
    await page.goto("/account/poems");
    await section.getByRole("link", { name: keptTitle }).click();
    await expect(page).toHaveURL(/\/account\/poems\/collections\/[0-9a-f-]{36}$/);
    await deleteOpenCollection(page, keptTitle);
    await deletePoem(page, freed);
    await deletePoem(page, free);
    await deletePoem(page, kept);
  },
);
