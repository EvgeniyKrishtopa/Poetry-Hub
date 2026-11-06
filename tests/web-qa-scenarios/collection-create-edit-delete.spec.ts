// pages: /login, /account/poems, /account/poems/collections/new, /account/poems/collections/<new collection id>, /account/poems/collections/<new collection id>/edit
import { expect, test } from "@playwright/test";

import { waitForHydration } from "./support/hydration";
import { signIn } from "./support/sign-in";

/** `author1@example.test` in `supabase/seed.sql`: a public author with no seeded collections. */
const EMAIL = "author1@example.test";
const DESCRIPTION = "Первая строка.\nВторая строка.";

// Each run deletes the collection it creates, so the scenario leaves no rows behind. Every create still counts
// toward author1's 50-per-30-days limit, and every save toward the 10-per-minute edit limit;
// `npx supabase db reset` starts the counts over.
// implements FR-1, FR-2, FR-4, FR-6, FR-7, FR-9, FR-13, FR-15 of add-poem-collections: create → edit → delete.
test("an author creates, edits, and deletes a collection", { tag: ["@add-poem-collections"] }, async ({ page }) => {
  // Unique per run, so parallel repeats never find each other's collection.
  const title = `QA сборник ${Date.now()}-${test.info().repeatEachIndex}`;
  const newTitle = `${title} изменён`;
  await signIn(page, EMAIL);
  const main = page.getByRole("main");

  // Create, from the link on /account/poems.
  await page.goto("/account/poems");
  await waitForHydration(page);
  await main.getByRole("link", { name: "Создать сборник произведений" }).click();
  await expect(main.getByRole("heading", { level: 1, name: "Создание сборника" })).toBeVisible();
  await waitForHydration(page);
  await main.getByRole("textbox", { name: "Название сборника" }).fill(title);
  await main.getByRole("textbox", { name: "Описание (необязательно)" }).fill(DESCRIPTION);
  await main.getByRole("button", { name: "Создать сборник" }).click();

  await expect(page).toHaveURL(/\/account\/poems$/);
  await expect(main.getByRole("status").filter({ hasText: `Сборник «${title}» создан.` })).toBeVisible();
  const section = main.getByRole("region", { name: "Сборники произведений" });
  await section.getByRole("link", { name: title }).click();

  // The collection page.
  await expect(page).toHaveURL(/\/account\/poems\/collections\/[0-9a-f-]{36}$/);
  const collectionUrl = page.url();
  await expect(main.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(main.getByText("Первая строка.")).toBeVisible();

  // Edit.
  await main.getByRole("link", { name: "Редактировать сборник" }).click();
  await expect(main.getByRole("heading", { level: 1, name: "Редактирование сборника" })).toBeVisible();
  await waitForHydration(page);
  const titleField = main.getByRole("textbox", { name: "Название сборника" });
  await expect(titleField).toHaveValue(title);
  await expect(main.getByRole("link", { name: "Вернуться к сборнику" })).toBeVisible();
  await titleField.fill(newTitle);
  await main.getByRole("button", { name: "Сохранить изменения" }).click();

  await expect(page).toHaveURL(collectionUrl);
  await expect(main.getByRole("heading", { level: 1, name: newTitle })).toBeVisible();
  await expect(main.getByRole("status").filter({ hasText: "Изменения сохранены." })).toBeVisible();

  // Delete.
  await waitForHydration(page);
  await main.getByRole("button", { name: "Удалить сборник" }).click();
  const dialog = page.getByRole("dialog", { name: "Удалить сборник?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(`Сборник «${newTitle}» будет удалён без возможности восстановления.`)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Отмена" })).toBeFocused();
  await dialog.getByRole("button", { name: "Удалить", exact: true }).click();

  await expect(page).toHaveURL(/\/account\/poems$/);
  await expect(main.getByRole("status").filter({ hasText: `Сборник «${newTitle}» удалён.` })).toBeVisible();
  await expect(main.getByRole("link", { name: newTitle })).toHaveCount(0);

  // The old address is gone.
  await page.goto(collectionUrl);
  await expect(main.getByRole("heading", { level: 1, name: "Страница не найдена" })).toBeVisible();
});
