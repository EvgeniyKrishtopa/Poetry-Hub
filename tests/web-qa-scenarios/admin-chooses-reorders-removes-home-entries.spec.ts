// pages: /login, /authors/10000000-0000-4000-8000-000000000005, /authors/10000000-0000-4000-8000-000000000005/poems/30000000-0000-4000-8000-000000000051, /authors/10000000-0000-4000-8000-000000000004/poems/30000000-0000-4000-8000-000000000041, /admin/home
import { expect, test, type Locator, type Page } from "@playwright/test";

import { waitForHydration } from "./support/hydration";
import { signIn } from "./support/sign-in";

/** `draft-author@example.test`: the seeded admin. */
const ADMIN_EMAIL = "draft-author@example.test";
/** author5 owns four seeded poems (`supabase/seed.sql`), enough to fill the list of four. */
const FULL_LIST_AUTHOR_ID = "10000000-0000-4000-8000-000000000005";
/** author4's first seeded poem: the fifth one, which the full list refuses. */
const FIFTH_POEM_PATH = "/authors/10000000-0000-4000-8000-000000000004/poems/30000000-0000-4000-8000-000000000041";

/** author5's four poems in the order they are added: the seed's own ids and titles. */
const POEMS = [
  { id: "30000000-0000-4000-8000-000000000051", title: "Осенний сад" },
  { id: "30000000-0000-4000-8000-000000000052", title: "Ночной вокзал" },
  { id: "30000000-0000-4000-8000-000000000053", title: "Зимний мост" },
  { id: "30000000-0000-4000-8000-000000000054", title: "Утренний двор" },
] as const;

const ADD_BUTTON = "Показать на главной";
const ADDED_NOTICE = "Показано на главной.";
const LIMIT_NOTICE = "На главной уже 4 произведения. Уберите одно на странице /admin/home.";
const PAGE_TITLE = "Главная страница";
const POEMS_HEADING = "Произведения";
const AUTHORS_HEADING = "Авторы";
const AUTHOR_NAME = "Ольга Северина";
const REMOVE_BUTTON = /^Убрать/;
/** How long a lifted row waits before the first arrow key, so the library has measured the list. */
const KEYBOARD_MEASURE_PAUSE_MS = 300;
/** How long one keyboard lift may take to be announced before it is tried again, and how long all tries may take. */
const LIFT_ATTEMPT_TIMEOUT_MS = 2_000;
const LIFT_TOTAL_TIMEOUT_MS = 15_000;

// A real pointer drag works in viewport coordinates, so every row's grip must be on screen together.
test.use({ viewport: { width: 1280, height: 1000 } });

const handleOf = (list: Locator, title: string) => list.getByRole("button", { name: `Переместить «${title}»` });
const rowTitles = (list: Locator) => list.getByRole("listitem").locator("span.text-base").allInnerTexts();

/** Holds the grip, carries it past the drag threshold, then over the target row. */
async function dragOnto(page: Page, grip: Locator, target: Locator): Promise<void> {
  const from = await grip.boundingBox();
  const to = await target.boundingBox();
  if (from === null || to === null) throw new Error("the grip or the target row is not on screen");
  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 12, start.y + 12, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
}

/** Opens `/admin/home` and removes every entry through the app, so the scenario starts and ends on empty lists. */
async function clearLists(page: Page): Promise<void> {
  await page.goto("/admin/home");
  await waitForHydration(page);
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1, name: PAGE_TITLE })).toBeVisible();
  const removeButtons = main.getByRole("button", { name: REMOVE_BUTTON });
  while ((await removeButtons.count()) > 0) {
    const before = await removeButtons.count();
    await removeButtons.first().click();
    await expect(removeButtons).toHaveCount(before - 1);
  }
}

/** Presses «Показать на главной» on a public page and waits for the result line. */
async function addFrom(page: Page, path: string, notice: string): Promise<void> {
  await page.goto(path);
  await waitForHydration(page);
  const button = page.getByRole("button", { name: ADD_BUTTON });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByText(notice)).toBeVisible();
}

// The shared lists of the home page change, so this runs in the project that runs after the rest; it removes everything it
// added through the app before it ends.
// implements FR-8, FR-9, FR-13 of home-page-sections: add, the limit message, reorder by mouse and keyboard, remove.
test(
  "an admin fills the home page's poem list, is refused a fifth, reorders by mouse and keyboard, and removes entries",
  { tag: ["@home-page-sections"] },
  async ({ page }) => {
    await signIn(page, ADMIN_EMAIL);
    await clearLists(page);

    // FR-8: four poems go in, each one a success line; the fifth is refused with the limit text and writes nothing.
    for (const poem of POEMS) {
      await addFrom(page, `/authors/${FULL_LIST_AUTHOR_ID}/poems/${poem.id}`, ADDED_NOTICE);
    }
    await addFrom(page, FIFTH_POEM_PATH, LIMIT_NOTICE);

    // FR-9: the page lists the four in the order added, each under the poem's author.
    await page.goto("/admin/home");
    await waitForHydration(page);
    const main = page.getByRole("main");
    const poems = main.getByRole("region", { name: POEMS_HEADING });
    await expect.poll(() => rowTitles(poems)).toEqual(POEMS.map((poem) => poem.title));
    await expect(poems.getByText(AUTHOR_NAME)).toHaveCount(POEMS.length);

    // FR-9, FR-13: a mouse drop of the last entry on the first one is saved and survives a reload.
    await dragOnto(page, handleOf(poems, "Утренний двор"), poems.getByRole("listitem").first());
    await expect.poll(() => rowTitles(poems)).toEqual(["Утренний двор", "Осенний сад", "Ночной вокзал", "Зимний мост"]);
    await page.reload();
    await waitForHydration(page);
    await expect.poll(() => rowTitles(poems)).toEqual(["Утренний двор", "Осенний сад", "Ночной вокзал", "Зимний мост"]);

    // FR-9: the keyboard does the same, space to lift, an arrow to move, space to drop.
    const grip = handleOf(poems, "Зимний мост");
    // The library attaches its key listeners after the page hydrates and nothing on the page says when; a Space pressed
    // before that does nothing, so the lift is tried again (Escape drops a half-made lift) until its live region speaks.
    await expect(async () => {
      await page.keyboard.press("Escape");
      await grip.focus();
      await page.keyboard.press("Space");
      await expect(page.getByText("Выбрано: «Зимний мост», позиция 4 из 4.")).toBeAttached({
        timeout: LIFT_ATTEMPT_TIMEOUT_MS,
      });
    }).toPass({ timeout: LIFT_TOTAL_TIMEOUT_MS });
    // The library measures the rows just after the lift, and an arrow pressed before that moves nothing. A person never
    // presses that fast; nothing on the page says when the measuring is done, so this waits a fixed moment.
    await page.waitForTimeout(KEYBOARD_MEASURE_PAUSE_MS);
    await page.keyboard.press("ArrowUp");
    await expect(page.getByText("Позиция 3 из 4.")).toBeAttached();
    await page.keyboard.press("Space");
    await expect(page.getByText("Положено на позицию 3 из 4.")).toBeAttached();
    await expect.poll(() => rowTitles(poems)).toEqual(["Утренний двор", "Осенний сад", "Зимний мост", "Ночной вокзал"]);
    await page.reload();
    await waitForHydration(page);
    await expect.poll(() => rowTitles(poems)).toEqual(["Утренний двор", "Осенний сад", "Зимний мост", "Ночной вокзал"]);

    // FR-9: remove one entry; the others keep their order and the freed slot takes the fifth poem.
    await poems.getByRole("button", { name: "Убрать «Осенний сад» с главной" }).click();
    await expect.poll(() => rowTitles(poems)).toEqual(["Утренний двор", "Зимний мост", "Ночной вокзал"]);
    await addFrom(page, FIFTH_POEM_PATH, ADDED_NOTICE);

    // FR-8, FR-9: an author goes into the other list, and leaves it again.
    await addFrom(page, `/authors/${FULL_LIST_AUTHOR_ID}`, ADDED_NOTICE);
    await page.goto("/admin/home");
    await waitForHydration(page);
    const authors = main.getByRole("region", { name: AUTHORS_HEADING });
    await expect(authors.getByRole("listitem")).toHaveCount(1);
    await expect(authors.getByText(AUTHOR_NAME)).toBeVisible();
    await authors.getByRole("button", { name: REMOVE_BUTTON }).click();
    await expect(authors.getByRole("listitem")).toHaveCount(0);

    await clearLists(page);
    await expect(main.getByRole("button", { name: REMOVE_BUTTON })).toHaveCount(0);
  },
);
