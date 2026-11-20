// pages: /login, /account/poems, /account/poems/new, /account/poems/<new poem id>, /account/poems/collections/new, /account/poems/collections/<new collection id>, /account/poems/collections/<new collection id>/poems, /authors/<author id>, /authors/<author id>/poems/<new poem id>, /authors/<author id>/collections/<new collection id>
import { expect, type Locator, type Page, test } from "@playwright/test";

import { waitForHydration } from "./support/hydration";
import { signIn } from "./support/sign-in";

/** `author5@example.test` in `supabase/seed.sql`: a public author; its poem and collection here are created and deleted again. */
const AUTHOR_EMAIL = "author5@example.test";
/** author5's profile id in `supabase/seed.sql`. */
const AUTHOR_PROFILE_ID = "10000000-0000-4000-8000-000000000005";
/** `draft-author@example.test`: the seeded admin. */
const ADMIN_EMAIL = "draft-author@example.test";
const POEM_TEXT = "Строка для проверки кнопки в список нарушителей.";
const NO_GENRE_LABEL = "Без жанра";
const SECTION_NAME = "Сборники произведений";
const ADD_BUTTON = "В список нарушителей (админ)";
const DIALOG_TITLE = "Добавить в список нарушителей?";
const DELETE_COLLECTION_BUTTON = "Удалить сборник (админ)";
const DELETE_POEM_BUTTON = "Удалить произведение (админ)";
const WIDE_VIEWPORT = { width: 1280, height: 900 };
/** The narrowest phone width the design covers. */
const NARROW_VIEWPORT = { width: 390, height: 844 };

/** The control and the delete button sit in one row, and the row fits the viewport without a horizontal scroll. */
async function expectControlsFitViewport(page: Page, controls: readonly Locator[]): Promise<void> {
  const viewport = page.viewportSize();
  if (viewport === null) throw new Error("the page has no viewport size");
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
  for (const control of controls) {
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    if (box === null) throw new Error("a control is not on screen");
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  }
}

/** Opens the add dialog and checks its default ground, then cancels it so nobody is added. */
async function openAndCancelAddDialog(page: Page): Promise<void> {
  const main = page.getByRole("main");
  await waitForHydration(page);
  await main.getByRole("button", { name: ADD_BUTTON }).click();
  const dialog = page.getByRole("dialog", { name: DIALOG_TITLE });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("radio").first()).toBeChecked();
  await dialog.getByRole("button", { name: "Отмена" }).click();
  await expect(dialog).toBeHidden();
}

/** The id at the end of a page address such as `/account/poems/<id>`. */
function lastPathSegment(address: string): string {
  const { pathname } = new URL(address);
  const segments = pathname.split("/");
  const last = segments.at(-1);
  if (last === undefined || last === "") throw new Error(`no id at the end of ${address}`);
  return last;
}

/** The author deletes the collection from its own page. */
async function deleteOwnCollection(page: Page, collectionUrl: string): Promise<void> {
  const main = page.getByRole("main");
  await page.goto(collectionUrl);
  await waitForHydration(page);
  await main.getByRole("button", { name: "Удалить сборник" }).click();
  const dialog = page.getByRole("dialog", { name: "Удалить сборник?" });
  await dialog.getByRole("button", { name: "Удалить", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/poems$/);
}

/** The author deletes the poem from its own page. */
async function deleteOwnPoem(page: Page, poemId: string, poemTitle: string): Promise<void> {
  const main = page.getByRole("main");
  await page.goto(`/account/poems/${poemId}`);
  await waitForHydration(page);
  await main.getByRole("button", { name: "Удалить произведение" }).click();
  const dialog = page.getByRole("dialog", { name: "Удалить произведение?" });
  await dialog.getByRole("button", { name: "Удалить", exact: true }).click();
  await expect(main.getByRole("status").filter({ hasText: `Произведение «${poemTitle}» удалено.` })).toBeVisible();
}

// Creates the poem and the collection it needs and deletes both through the app before it ends, so author5 stays as
// seeded, also when an assertion fails in between (the cleanup is in a finally block). It runs after the other scenarios (playwright.config.ts) because author5's lists are read by them. The
// admin only opens and cancels the dialog: no case is added, no email is sent.
// implements FR-2, NFR-4 of admin-violations-feedback: the add control sits next to the delete button on the poem,
// collection and author pages for an admin, fits a 390px screen, and a guest sees none of it.
test(
  "an admin sees the add control next to delete on the collection page and it fits a narrow screen",
  { tag: ["@admin-violations-feedback"] },
  async ({ page, browser }) => {
    const runId = `${Date.now()}-${test.info().repeatEachIndex}`;
    const poemTitle = `QA стих для кнопки ${runId}`;
    const collectionTitle = `QA сборник для кнопки ${runId}`;
    const main = page.getByRole("main");
    let createdPoemId: string | null = null;
    let createdCollectionUrl: string | null = null;

    try {
      // The author creates a poem and a collection holding it.
      await signIn(page, AUTHOR_EMAIL);
      await page.goto("/account/poems/new");
      await waitForHydration(page);
      await main.getByRole("textbox", { name: "Название произведения" }).fill(poemTitle);
      await main.getByRole("textbox", { name: "Текст произведения" }).fill(POEM_TEXT);
      await main.getByLabel("Выберите жанр").selectOption(NO_GENRE_LABEL);
      await main.getByRole("button", { name: "Добавить произведение" }).click();
      await expect(page).toHaveURL(/\/account\/poems\/[0-9a-f-]{36}$/);
      const poemId = lastPathSegment(page.url());
      createdPoemId = poemId;

      await page.goto("/account/poems");
      await waitForHydration(page);
      await main.getByRole("link", { name: "Создать сборник произведений" }).click();
      await waitForHydration(page);
      await main.getByRole("textbox", { name: "Название сборника" }).fill(collectionTitle);
      await main.getByRole("button", { name: "Создать сборник" }).click();
      await expect(page).toHaveURL(/\/account\/poems$/);
      await main.getByRole("region", { name: SECTION_NAME }).getByRole("link", { name: collectionTitle }).click();
      await expect(page).toHaveURL(/\/account\/poems\/collections\/[0-9a-f-]{36}$/);
      const collectionId = lastPathSegment(page.url());
      createdCollectionUrl = page.url();
      const { origin } = new URL(page.url());
      await waitForHydration(page);
      await main.getByRole("button", { name: "Произведения сборника" }).click();
      await waitForHydration(page);
      await main.getByRole("checkbox", { name: poemTitle }).check();
      await main.getByRole("button", { name: "Сохранить выбранное" }).click();
      await expect(main.getByRole("status").filter({ hasText: "Произведения сборника сохранены." })).toBeVisible();

      const poemPath = `/authors/${AUTHOR_PROFILE_ID}/poems/${poemId}`;
      const collectionPath = `/authors/${AUTHOR_PROFILE_ID}/collections/${collectionId}`;
      const authorPath = `/authors/${AUTHOR_PROFILE_ID}`;

      // A guest sees no moderation control on any of the three pages.
      const guest = await browser.newContext({ baseURL: origin });
      const guestPage = await guest.newPage();
      for (const path of [poemPath, collectionPath, authorPath]) {
        await guestPage.goto(path);
        await waitForHydration(guestPage);
        await expect(guestPage.getByRole("main").getByRole("button", { name: ADD_BUTTON })).toHaveCount(0);
      }
      await guest.close();

      // The admin, wide then narrow: the control next to the delete button, fitting the screen.
      const adminContext = await browser.newContext({ baseURL: origin, viewport: WIDE_VIEWPORT });
      const adminPage = await adminContext.newPage();
      await signIn(adminPage, ADMIN_EMAIL);
      const adminMain = adminPage.getByRole("main");
      const targets = [
        { path: collectionPath, deleteName: DELETE_COLLECTION_BUTTON },
        { path: poemPath, deleteName: DELETE_POEM_BUTTON },
      ];
      for (const viewport of [WIDE_VIEWPORT, NARROW_VIEWPORT]) {
        await adminPage.setViewportSize(viewport);
        for (const { path, deleteName } of targets) {
          await adminPage.goto(path);
          await waitForHydration(adminPage);
          const addButton = adminMain.getByRole("button", { name: ADD_BUTTON });
          const deleteButton = adminMain.getByRole("button", { name: deleteName });
          await expect(addButton).toBeVisible();
          await expectControlsFitViewport(adminPage, [addButton, deleteButton]);
        }
        await adminPage.goto(authorPath);
        await waitForHydration(adminPage);
        await expectControlsFitViewport(adminPage, [adminMain.getByRole("button", { name: ADD_BUTTON })]);
      }

      // The dialog opens with the first ground preselected and cancels without adding anybody.
      await adminPage.setViewportSize(NARROW_VIEWPORT);
      await adminPage.goto(collectionPath);
      await openAndCancelAddDialog(adminPage);
      await adminContext.close();

    } finally {
      // Cleanup: the author deletes the collection, then the poem.
      if (createdCollectionUrl !== null) await deleteOwnCollection(page, createdCollectionUrl);
      if (createdPoemId !== null) await deleteOwnPoem(page, createdPoemId, poemTitle);
    }
  },
);
