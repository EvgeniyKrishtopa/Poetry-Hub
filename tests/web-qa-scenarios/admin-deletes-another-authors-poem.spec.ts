// pages: /login, /account/poems/new, /account/poems/<new poem id>, /authors/<author id>/poems/<new poem id>, /authors/<author id>
import { expect, test } from "@playwright/test";

import { waitForHydration } from "./support/hydration";
import { signIn } from "./support/sign-in";
import { signInAsAdmin } from "./support/sign-in-as-admin";

/** `author1@example.test` in `supabase/seed.sql`: a public author with no seeded poems. */
const AUTHOR_EMAIL = "author1@example.test";
/** author1's profile id in `supabase/seed.sql`. */
const AUTHOR_PROFILE_ID = "10000000-0000-4000-8000-000000000001";
const POEM_TEXT = "Строка для проверки удаления администратором.";
const NO_GENRE_LABEL = "Без жанра";
const ADMIN_DELETE_BUTTON = "Удалить произведение (админ)";

// Each run creates the poem it deletes, so the scenario leaves no rows behind. Every create still counts toward
// author1's 100-per-30-days limit (ADR 0010); `npx supabase db reset` starts the count over.
// implements FR-10 of admin-moderation: the author and a guest see no control, the admin cancels once and then deletes.
test(
  "an admin deletes another author's poem from its public page and lands on the author page",
  { tag: ["@admin-moderation"] },
  async ({ page, browser }) => {
    // Unique per run, so parallel repeats never find each other's poem.
    const title = `QA админ-удаление ${Date.now()}-${test.info().repeatEachIndex}`;

    await signIn(page, AUTHOR_EMAIL);
    await page.goto("/account/poems/new");
    await waitForHydration(page);
    const main = page.getByRole("main");
    await main.getByRole("textbox", { name: "Название произведения" }).fill(title);
    await main.getByRole("textbox", { name: "Текст произведения" }).fill(POEM_TEXT);
    await main.getByLabel("Выберите жанр").selectOption(NO_GENRE_LABEL);
    await main.getByRole("button", { name: "Добавить произведение" }).click();
    await expect(page).toHaveURL(/\/account\/poems\/[0-9a-f-]{36}$/);
    const poemId = page.url().split("/").pop() ?? "";

    const poemPath = `/authors/${AUTHOR_PROFILE_ID}/poems/${poemId}`;

    // The author on their own poem page and a guest see no moderation control.
    await page.goto(poemPath);
    await expect(page.getByRole("main").getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole("button", { name: ADMIN_DELETE_BUTTON })).toHaveCount(0);

    const guest = await (await browser.newContext()).newPage();
    await guest.goto(poemPath);
    await expect(guest.getByRole("main").getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(guest.getByRole("button", { name: ADMIN_DELETE_BUTTON })).toHaveCount(0);
    await guest.context().close();

    // The admin sees it, cancels once, then confirms.
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await signInAsAdmin(adminPage);
    await adminPage.goto(poemPath);
    await waitForHydration(adminPage);
    await adminPage.getByRole("button", { name: ADMIN_DELETE_BUTTON }).click();
    const dialog = adminPage.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Отмена" })).toBeFocused();
    await dialog.getByRole("button", { name: "Отмена" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(adminPage.getByRole("main").getByRole("heading", { level: 1, name: title })).toBeVisible();

    await adminPage.getByRole("button", { name: ADMIN_DELETE_BUTTON }).click();
    await adminPage.getByRole("dialog").getByRole("button", { name: "Удалить", exact: true }).click();
    await expect(adminPage).toHaveURL(new RegExp(`/authors/${AUTHOR_PROFILE_ID}$`));
    await expect(adminPage.getByRole("main").getByRole("link", { name: title })).toHaveCount(0);
    await adminContext.close();
  },
);
