// pages: /login, /account/poems, /account/poems/new, /account/poems/30000000-0000-4000-8000-000000000051, /account/poems/30000000-0000-4000-8000-0000000000ff
import { expect, type Page, test } from "@playwright/test";

import { signIn } from "./support/sign-in";

/** `author5@example.test` in `supabase/seed.sql`, with four seeded poems. */
const EMAIL = "author5@example.test";
const POEM_ID = "30000000-0000-4000-8000-000000000051";
const POEM_TITLE = "Осенний сад";
/** A well-formed id no poem has. */
const UNKNOWN_POEM_ID = "30000000-0000-4000-8000-0000000000ff";
const MANAGEMENT_TRAIL = ["Главная", "Мастерская поэта", "Управление произведениями"];

async function expectTrail(page: Page, labels: readonly string[]): Promise<void> {
  const trail = page.getByRole("navigation", { name: "Навигационная цепочка" });
  // Each item after the first also holds the hidden separator, so the items are matched by containment.
  await expect(trail.getByRole("listitem")).toHaveCount(labels.length);
  await expect(trail.getByRole("listitem")).toContainText([...labels]);
  await expect(trail.getByText(labels.at(-1) ?? "", { exact: true })).toHaveAttribute("aria-current", "page");
}

// implements FR-8 of add-poem-creation: the three management pages' trails, and none on a 404.
test("the poem management pages show their breadcrumb trails", { tag: ["@add-poem-creation"] }, async ({ page }) => {
  await signIn(page, EMAIL);

  await page.goto("/account/poems");
  await expectTrail(page, MANAGEMENT_TRAIL);

  await page.goto("/account/poems/new");
  await expectTrail(page, [...MANAGEMENT_TRAIL, "Добавление нового произведения"]);

  await page.goto(`/account/poems/${POEM_ID}`);
  await expect(page.getByRole("main").getByRole("heading", { level: 1, name: POEM_TITLE })).toBeVisible();
  await expectTrail(page, [...MANAGEMENT_TRAIL, POEM_TITLE]);

  await page.goto(`/account/poems/${UNKNOWN_POEM_ID}`);
  await expect(page.getByRole("main").getByRole("heading", { name: "Страница не найдена" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Навигационная цепочка" })).toHaveCount(0);
});
