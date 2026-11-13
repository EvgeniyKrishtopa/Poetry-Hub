// pages: /login, /account/poems, /account/poems/new, /account/poems/<new poem id>, /account/poems/collections/new, /account/poems/collections/<new collection id>, /account/poems/collections/<new collection id>/poems, /authors/10000000-0000-4000-8000-000000000004
import { expect, type Page, test } from "@playwright/test";

import { waitForHydration } from "./support/hydration";
import { signIn } from "./support/sign-in";

/** `author4@example.test` in `supabase/seed.sql`: a public author with three free poems and no collection. */
const EMAIL = "author4@example.test";
const AUTHOR_PATH = "/authors/10000000-0000-4000-8000-000000000004";
const POEM_TEXT = "Строка для проверки порядка сборников.";
const NO_GENRE_LABEL = "Без жанра";
const SECTION_NAME = "Сборники произведений";
/** The library ignores the first arrow pressed within a few milliseconds of lifting (tasks.md 5.1). */
const LIFT_SETTLE_MS = 300;
const STEP_SETTLE_MS = 150;
/** More than any board this scenario meets: one step moves a collection past one neighbour. */
const MAX_STEPS = 12;

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

/** Deletes a poem from its page, reached through the board on /account/poems. */
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

// Each run adds two poems and two collections and deletes all four, so parallel repeats never touch each other's
// rows. Every run counts two poem creates (100 per 30 days), two collection creates (50 per 30 days), two saves
// (10 per minute) and a few moves (30 per minute); `npx supabase db reset` starts the counts over.
// implements FR-5, FR-8, FR-9 of drag-and-drop-ordering: the author lifts a collection with the keyboard and drops
// it above its neighbour; the new order holds after a reload and a guest sees it on the author page.
test(
  "an author reorders collections and a guest sees the new order",
  { tag: ["@drag-and-drop-ordering"] },
  async ({ page, browser }) => {
    // Unique per run, so parallel repeats never find each other's rows.
    const runId = `${Date.now()}-${test.info().repeatEachIndex}`;
    const firstTitle = `QA сборник первый ${runId}`;
    const secondTitle = `QA сборник второй ${runId}`;
    const firstPoem = `QA стих первого ${runId}`;
    const secondPoem = `QA стих второго ${runId}`;
    await signIn(page, EMAIL);
    const main = page.getByRole("main");
    const section = main.getByRole("region", { name: SECTION_NAME });
    /** This run's collection titles only, in page order: other runs' collections can sit between them. */
    const ownCollections = (scope: typeof section) => scope.getByRole("link", { name: new RegExp(`^QA сборник .* ${runId}$`) });

    await createPoem(page, firstPoem);
    await createPoem(page, secondPoem);
    await createCollectionWith(page, firstTitle, firstPoem);
    await createCollectionWith(page, secondTitle, secondPoem);

    // A new collection goes first, so the second one created leads.
    await page.goto("/account/poems");
    await waitForHydration(page);
    await expect(ownCollections(section)).toHaveText([secondTitle, firstTitle]);

    // Lift the first collection by its handle and move it up until it is above the second.
    const handle = section.getByRole("button", { name: `Переместить сборник «${firstTitle}»` });
    await expect(handle).toBeEnabled();
    // The board hydrates after the body marker, so retry the lift until the handle reports it is pressed. A Space
    // is sent only while it is not: a second one would drop the item again.
    await expect(async () => {
      if ((await handle.getAttribute("aria-pressed")) !== "true") {
        await handle.focus();
        await page.keyboard.press("Space");
      }
      await expect(handle).toHaveAttribute("aria-pressed", "true", { timeout: 1_500 });
    }).toPass();
    await page.waitForTimeout(LIFT_SETTLE_MS);
    for (let step = 0; step < MAX_STEPS; step++) {
      const titles = await ownCollections(section).allTextContents();
      if (titles[0] === firstTitle) break;
      await page.keyboard.press("ArrowUp");
      await page.waitForTimeout(STEP_SETTLE_MS);
    }
    await page.keyboard.press("Space");
    await expect(handle).not.toHaveAttribute("aria-pressed", "true");
    await expect(main.locator('[aria-busy="true"]')).toHaveCount(0);
    await expect(ownCollections(section)).toHaveText([firstTitle, secondTitle]);

    // The order is stored: it holds after a reload.
    await page.reload();
    await waitForHydration(page);
    await expect(ownCollections(section)).toHaveText([firstTitle, secondTitle]);

    // A guest sees the same order on the author page, with no handle.
    const guest = await browser.newContext({ baseURL: new URL(page.url()).origin });
    const guestPage = await guest.newPage();
    await guestPage.goto(AUTHOR_PATH);
    const guestMain = guestPage.getByRole("main");
    await expect(guestMain.getByRole("heading", { level: 2, name: SECTION_NAME })).toBeVisible();
    await expect(ownCollections(guestMain)).toHaveText([firstTitle, secondTitle]);
    await expect(guestMain.getByRole("button", { name: /^Переместить/ })).toHaveCount(0);
    await guest.close();

    // Cleanup: both collections, then both poems.
    await page.goto("/account/poems");
    await section.getByRole("link", { name: firstTitle }).click();
    await expect(page).toHaveURL(/\/account\/poems\/collections\/[0-9a-f-]{36}$/);
    await deleteOpenCollection(page, firstTitle);
    await section.getByRole("link", { name: secondTitle }).click();
    await expect(page).toHaveURL(/\/account\/poems\/collections\/[0-9a-f-]{36}$/);
    await deleteOpenCollection(page, secondTitle);
    await deletePoem(page, firstPoem);
    await deletePoem(page, secondPoem);
  },
);
