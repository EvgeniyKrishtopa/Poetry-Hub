// pages: /, /login, /admin/home, /authors/10000000-0000-4000-8000-000000000004, /authors/10000000-0000-4000-8000-000000000005, /authors/10000000-0000-4000-8000-000000000005/poems/30000000-0000-4000-8000-000000000051
import { expect, test, type Locator, type Page } from "@playwright/test";

import { waitForHydration } from "./support/hydration";
import { signIn } from "./support/sign-in";

/** `draft-author@example.test`: the seeded admin. */
const ADMIN_EMAIL = "draft-author@example.test";
const FIRST_AUTHOR = { id: "10000000-0000-4000-8000-000000000005", name: "Ольга Северина" } as const;
const SECOND_AUTHOR = { id: "10000000-0000-4000-8000-000000000004", name: "Пётр Ласточкин" } as const;

/** The first author's four seeded poems (`supabase/seed.sql`), in the order the admin adds them. */
const POEMS = [
  { id: "30000000-0000-4000-8000-000000000051", title: "Осенний сад" },
  { id: "30000000-0000-4000-8000-000000000052", title: "Ночной вокзал" },
  { id: "30000000-0000-4000-8000-000000000053", title: "Зимний мост" },
  { id: "30000000-0000-4000-8000-000000000054", title: "Утренний двор" },
] as const;
const [AUTUMN, NIGHT, WINTER, MORNING] = POEMS.map((poem) => poem.title);

const ADD_BUTTON = "Показать на главной";
const ADDED_NOTICE = "Показано на главной.";
const PAGE_TITLE = "Главная страница";
const REMOVE_BUTTON = /^Убрать/;
const POEMS_HEADING = "Произведения";
const FEATURED_HEADING = "Избранные произведения";
const AUTHORS_HEADING = "Авторы проекта";
/** How long a lifted row waits before the first arrow key, so the library has measured the list. */
const KEYBOARD_MEASURE_PAUSE_MS = 300;
const VIEWPORT = { width: 1280, height: 1000 };
/** How long the guest's cached home page may take to show an admin's change; the change expires it at once. */
const HOME_REFRESH_TIMEOUT_MS = 15_000;
/** How long one keyboard lift may take to be announced before it is tried again. */
const LIFT_ATTEMPT_TIMEOUT_MS = 2_000;
const LIFT_TOTAL_TIMEOUT_MS = 15_000;
/** The scenario signs in, adds six entries, moves one, removes two and waits on the guest's cached page after each. */
const SCENARIO_TIMEOUT_MS = 120_000;

test.use({ viewport: VIEWPORT });

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

/** Presses the add-to-home button on a public page and waits for the result line. */
async function addFrom(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForHydration(page);
  const button = page.getByRole("button", { name: ADD_BUTTON });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByText(ADDED_NOTICE)).toBeVisible();
}

/** The home page's band under the given h2, or nothing when that band is not on the page. */
function sectionUnder(page: Page, heading: string): Locator {
  return page
    .getByRole("main")
    .locator("section")
    .filter({ has: page.getByRole("heading", { level: 2, name: heading, exact: true }) });
}

/** The names, in page order, of the cards in a home band that contain one of `names`. */
async function cardNames(section: Locator, names: readonly string[]): Promise<string[]> {
  const texts = await section.getByRole("listitem").allInnerTexts();
  return texts.map((text) => names.find((name) => text.includes(name)) ?? text);
}

/**
 * Reloads the guest's home page until the band lists exactly `expected`, in that order. The guest's page is cached and
 * an admin's change expires it, so a reload right after the change may still show the old list.
 */
async function expectHomeBand(guest: Page, heading: string, names: readonly string[], expected: readonly string[]) {
  await expect
    .poll(
      async () => {
        await guest.goto("/");
        const section = sectionUnder(guest, heading);
        return cardNames(section, names);
      },
      { timeout: HOME_REFRESH_TIMEOUT_MS },
    )
    .toEqual(expected);
}

// The chosen lists are shared, so this runs in the project that runs after the rest; it removes everything it
// added through the app before it ends.
// implements FR-2, FR-4, FR-9, FR-13 of home-page-sections: the admin's order, move and removals reach the guest's home page.
test(
  "the home page lists the admin's chosen poems and authors in the chosen order and follows a move and a removal",
  { tag: ["@home-featured-order-on-page"] },
  async ({ page, browser, baseURL }) => {
    test.setTimeout(SCENARIO_TIMEOUT_MS);
    await signIn(page, ADMIN_EMAIL);
    await clearLists(page);
    const guestContext = await browser.newContext({ baseURL, viewport: VIEWPORT });
    const guest = await guestContext.newPage();
    const poemTitles = POEMS.map((poem) => poem.title);
    const authorNames = [FIRST_AUTHOR.name, SECOND_AUTHOR.name];

    try {
      // Four poems and two authors go in; the guest sees each list in the order they were added.
      for (const poem of POEMS) {
        await addFrom(page, `/authors/${FIRST_AUTHOR.id}/poems/${poem.id}`);
      }
      await addFrom(page, `/authors/${FIRST_AUTHOR.id}`);
      await addFrom(page, `/authors/${SECOND_AUTHOR.id}`);
      await expectHomeBand(guest, FEATURED_HEADING, poemTitles, [AUTUMN, NIGHT, WINTER, MORNING]);
      await expectHomeBand(guest, AUTHORS_HEADING, authorNames, authorNames);

      // The admin lifts the last poem one place up with the keyboard; the guest's page follows.
      await page.goto("/admin/home");
      await waitForHydration(page);
      const poems = page.getByRole("main").getByRole("region", { name: POEMS_HEADING });
      const grip = poems.getByRole("button", { name: `Переместить «${MORNING}»` });
      // The library attaches its key listeners after the page hydrates and nothing on the page says when; a Space pressed
      // before that does nothing, so the lift is tried again (Escape drops a half-made lift) until it is announced.
      await expect(async () => {
        await page.keyboard.press("Escape");
        await grip.focus();
        await page.keyboard.press("Space");
        await expect(page.getByText(`Выбрано: «${MORNING}», позиция 4 из 4.`)).toBeAttached({
          timeout: LIFT_ATTEMPT_TIMEOUT_MS,
        });
      }).toPass({ timeout: LIFT_TOTAL_TIMEOUT_MS });
      // The library measures the rows just after the lift, and an arrow pressed before that moves nothing.
      await page.waitForTimeout(KEYBOARD_MEASURE_PAUSE_MS);
      await page.keyboard.press("ArrowUp");
      await expect(page.getByText("Позиция 3 из 4.")).toBeAttached();
      await page.keyboard.press("Space");
      await expect(page.getByText("Положено на позицию 3 из 4.")).toBeAttached();
      await expectHomeBand(guest, FEATURED_HEADING, poemTitles, [AUTUMN, NIGHT, MORNING, WINTER]);

      // Removing a poem and an author takes them off the guest's page; the others keep their order.
      await poems.getByRole("button", { name: `Убрать «${NIGHT}» с главной` }).click();
      await expect(poems.getByRole("listitem")).toHaveCount(POEMS.length - 1);
      await expectHomeBand(guest, FEATURED_HEADING, poemTitles, [AUTUMN, MORNING, WINTER]);
      const authors = page.getByRole("main").getByRole("region", { name: "Авторы" });
      await authors.getByRole("button", { name: new RegExp(`^Убрать.*${FIRST_AUTHOR.name}`) }).click();
      await expect(authors.getByRole("listitem")).toHaveCount(1);
      await expectHomeBand(guest, AUTHORS_HEADING, authorNames, [SECOND_AUTHOR.name]);
    } finally {
      // The guest's window closes even when emptying the lists fails, and that failure must not hide the test's own.
      try {
        await clearLists(page);
      } finally {
        await guestContext.close();
      }
    }
  },
);
