// pages: /authors/501634db-2e8f-4a20-b60e-a74c6d5d84fa/poems/nope, /authors/501634db-2e8f-4a20-b60e-a74c6d5d84fa/poems/OSENNIY-SAD, /authors/00000000-0000-4000-8000-000000000000/poems
import { expect, test } from "@playwright/test";

/** A public author in the local Supabase seed data, with four mock poems. */
const AUTHOR_ID = "501634db-2e8f-4a20-b60e-a74c6d5d84fa";
/** A valid UUID that names no profile. */
const UNKNOWN_AUTHOR_ID = "00000000-0000-4000-8000-000000000000";

const NOT_FOUND_PATHS = [
  `/authors/${AUTHOR_ID}/poems/nope`,
  `/authors/${AUTHOR_ID}/poems/OSENNIY-SAD`,
  `/authors/${UNKNOWN_AUTHOR_ID}/poems`,
];

// implements FR-5 of add-author-poems: an unknown poem, a differently cased poem id, or an unknown
// author renders the 404 page. The status isn't checked: the spec allows a streamed 200.
for (const path of NOT_FOUND_PATHS) {
  test(`${path} renders the not-found page with no trail`, {
    tag: ["@add-author-poems"],
  }, async ({ page }) => {
    await page.goto(path);

    await expect(page.getByRole("heading", { level: 1, name: "Страница не найдена" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Навигационная цепочка" })).toHaveCount(0);
  });
}
