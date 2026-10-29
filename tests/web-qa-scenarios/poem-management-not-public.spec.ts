// pages: /login, /account/poems, /account/poems/new, /account/poems/30000000-0000-4000-8000-000000000051
import { expect, test } from "@playwright/test";

import { signIn } from "./support/sign-in";

/** `draft-author@example.test` in `supabase/seed.sql`: a profile without a first and last name. */
const EMAIL = "draft-author@example.test";
/** author5's seeded poem: someone else's poem. */
const OTHER_AUTHORS_POEM_ID = "30000000-0000-4000-8000-000000000051";
const NOT_PUBLIC_TEXT = "Чтобы добавлять произведения, укажите имя и фамилию в профиле автора.";

// implements FR-2, FR-3, FR-7 of add-poem-creation: a reader without a public profile gets the notice
// and the editor link instead of the list or the form, and another author's poem is a 404.
test("a reader without a public profile sees the not-public notice instead of the list and the form", {
  tag: ["@add-poem-creation"],
}, async ({ page }) => {
  await signIn(page, EMAIL);
  const main = page.getByRole("main");

  for (const path of ["/account/poems", "/account/poems/new"]) {
    await page.goto(path);
    await expect(main.getByText(NOT_PUBLIC_TEXT)).toBeVisible();
    await expect(main.getByRole("link", { name: "Перейти к профилю автора" })).toHaveAttribute("href", "/account/author");
    await expect(main.getByRole("button", { name: "Добавить произведение" })).toHaveCount(0);
    await expect(main.getByRole("link", { name: "Добавить новое произведение" })).toHaveCount(0);
  }

  await page.goto(`/account/poems/${OTHER_AUTHORS_POEM_ID}`);
  await expect(main.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Осенний сад" })).toHaveCount(0);
});
