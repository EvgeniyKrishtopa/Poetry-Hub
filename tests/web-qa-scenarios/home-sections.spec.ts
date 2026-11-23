// pages: /, /login, /admin/home, /authors/10000000-0000-4000-8000-000000000005, /authors/10000000-0000-4000-8000-000000000005/poems/30000000-0000-4000-8000-000000000051
import { expect, test, type Page } from "@playwright/test";

import { waitForHydration } from "./support/hydration";
import { signIn } from "./support/sign-in";

/** `draft-author@example.test`: the seeded admin. */
const ADMIN_EMAIL = "draft-author@example.test";
/** author5 owns four seeded poems (`supabase/seed.sql`); the first one is chosen for the featured section. */
const AUTHOR_ID = "10000000-0000-4000-8000-000000000005";
const POEM_ID = "30000000-0000-4000-8000-000000000051";
const POEM_TITLE = "Осенний сад";
const AUTHOR_NAME = "Ольга Северина";

const ADD_BUTTON = "Показать на главной";
const ADDED_NOTICE = "Показано на главной.";
const PAGE_TITLE = "Главная страница";
const REMOVE_BUTTON = /^Убрать/;

const SHARED_HEADINGS = [
  "Избранные произведения",
  "О проекте",
  "Авторы проекта",
  "Последние публикации",
] as const;
const INVITATION_HEADING = "Станьте частью Поэтического Хаба";
const INVITATION_BUTTON = "Присоединиться к проекту";

const VIEWPORT_HEIGHT = 900;
const VIEWPORTS = [360, 768, 1280] as const;

/** Presses «Показать на главной» on a public page and waits for the result line. */
async function addFrom(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForHydration(page);
  const button = page.getByRole("button", { name: ADD_BUTTON });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByText(ADDED_NOTICE)).toBeVisible();
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

/** The page's width, to compare with the viewport's: a wider page scrolls sideways. */
async function documentWidth(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth);
}

/** The five shared sections, plus the closing invitation only for a visitor who is not signed in (FR-6). */
async function expectSections(page: Page, { withInvitation }: { withInvitation: boolean }): Promise<void> {
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1 })).toHaveCount(1);
  const headings = withInvitation ? [...SHARED_HEADINGS, INVITATION_HEADING] : [...SHARED_HEADINGS];
  await expect(main.getByRole("heading", { level: 2 })).toHaveText(headings);
  await expect(main.getByRole("link", { name: "Читать произведения" })).toHaveAttribute("href", "/authors");
  await expect(main.getByRole("link", { name: "Стать автором" })).toHaveAttribute("href", "/signup");
  await expect(main.getByRole("link", { name: "Подробнее о проекте" })).toHaveAttribute("href", "/about");
  const invitationButton = main.getByRole("link", { name: INVITATION_BUTTON });
  if (withInvitation) await expect(invitationButton).toHaveAttribute("href", "/signup");
  else await expect(invitationButton).toHaveCount(0);
}

// The chosen lists are shared, so this runs in the project that runs after the rest; it removes everything it
// added through the app before it ends.
// implements FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-13, NFR-2, NFR-5 of home-page-sections: the sections for a guest and, without the closing invitation, a signed-in admin.
test(
  "the home page shows six sections to a guest and five to a signed-in admin, without sideways scrolling",
  { tag: ["@home-page-sections"] },
  async ({ page, browser, baseURL }) => {
    await signIn(page, ADMIN_EMAIL);
    await clearLists(page);

    try {
      await addFrom(page, `/authors/${AUTHOR_ID}/poems/${POEM_ID}`);
      await addFrom(page, `/authors/${AUTHOR_ID}`);

      // A guest's page is the cached one the admin's change has just expired (FR-13).
      const guestContext = await browser.newContext({ baseURL });
      const guest = await guestContext.newPage();
      await guest.setViewportSize({ width: VIEWPORTS[2], height: VIEWPORT_HEIGHT });
      await guest.goto("/");
      const guestMain = guest.getByRole("main");
      await expectSections(guest, { withInvitation: true });
      await expect(guestMain.getByRole("link", { name: `${POEM_TITLE}, ${AUTHOR_NAME}` })).toHaveAttribute(
        "href",
        `/authors/${AUTHOR_ID}/poems/${POEM_ID}`,
      );
      await expect(guestMain.getByRole("link", { name: new RegExp(AUTHOR_NAME) }).first()).toBeVisible();

      // NFR-2: no sideways scroll at a phone, a tablet and a desktop width.
      for (const width of VIEWPORTS) {
        await guest.setViewportSize({ width, height: VIEWPORT_HEIGHT });
        await guest.goto("/");
        await expect(guestMain.getByRole("heading", { level: 1 })).toBeVisible();
        expect(await documentWidth(guest)).toBeLessThanOrEqual(width);
      }
      await guestContext.close();

      // FR-6: the signed-in admin sees the same five sections and no closing invitation.
      await page.goto("/");
      await expectSections(page, { withInvitation: false });
    } finally {
      await clearLists(page);
    }
  },
);
