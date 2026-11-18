// pages: /login, /admin, /admin/violations
import { expect, test, type Locator, type Page } from "@playwright/test";

import { waitForHydration } from "./support/hydration";
import { signIn } from "./support/sign-in";

/** `draft-author@example.test`: the seeded admin. */
const ADMIN_EMAIL = "draft-author@example.test";
/** Two seed readers who are active and own no scenario of their own, so the list is theirs for the run. */
const BUTTON_USER = "author2@example.test";
const DROPPED_USER = "author3@example.test";

const LIST_LINK = "Список нарушителей";
const ADD_BUTTON = "В список нарушителей";
const DIALOG_TITLE = "Добавить в список нарушителей?";
const DROP_CAPTION = "Отпустите, чтобы добавить";
const ADDED_NOTICE = "Пользователь добавлен в список нарушителей";
const ALREADY_NOTICE = "Уже в списке нарушителей";
const HARMFUL_GROUND = "Вредный текст";
const MALICIOUS_GROUND = "Злонамеренные действия";
const WARN_BUTTON = "Отправить предупреждение";
const SWITCH_BUTTON = "Сменить основание";
const REMOVE_BUTTON = "Убрать из списка";
const GROUND_CHANGED_NOTICE = "Основание изменено";
const EMPTY_LIST = "В списке никого нет";

// A real pointer drag works in viewport coordinates, so the link and every row's grip must be on screen together.
test.use({ viewport: { width: 1280, height: 1000 } });

/** Holds the grip, carries it past the drag threshold, then over the target, and checks the target lights up. */
async function dragOnto(page: Page, grip: Locator, target: Locator): Promise<void> {
  const from = await grip.boundingBox();
  const to = await target.boundingBox();
  if (from === null || to === null) throw new Error("the grip or the drop target is not on screen");
  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 12, start.y + 12, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await expect(page.getByText(DROP_CAPTION)).toBeVisible();
  await page.mouse.up();
}

// Leaves no case behind: both cases are removed through the app before it ends.
// implements FR-1, FR-3, FR-4, FR-5, FR-7 of admin-violations-feedback: the button, the drop, the list and the ground switch.
test(
  "an admin adds users to the review list by button and by drop, switches a ground and clears the list",
  { tag: ["@admin-violations-feedback"] },
  async ({ page }) => {
    await signIn(page, ADMIN_EMAIL);
    await page.goto("/admin");
    await waitForHydration(page);
    const main = page.getByRole("main");
    const row = (email: string) => main.getByRole("listitem").filter({ hasText: email });

    // FR-3: no email filter, the link leads to the review list, every active row has the add controls.
    await expect(main.getByRole("heading", { level: 1, name: "Пользователи" })).toBeVisible();
    await expect(main.getByLabel("Электронная почта")).toHaveCount(0);
    await expect(main.getByRole("link", { name: LIST_LINK })).toHaveAttribute("href", "/admin/violations");

    // The button: cancel adds nobody, then confirm with the preselected ground.
    await row(BUTTON_USER).getByRole("button", { name: ADD_BUTTON }).click();
    const dialog = page.getByRole("dialog", { name: DIALOG_TITLE });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(BUTTON_USER)).toBeVisible();
    await expect(dialog.getByRole("radio", { name: new RegExp(HARMFUL_GROUND) })).toBeChecked();
    await dialog.getByRole("button", { name: "Отмена" }).click();
    await expect(dialog).toBeHidden();
    await expect(main.getByText(ADDED_NOTICE)).toHaveCount(0);

    await row(BUTTON_USER).getByRole("button", { name: ADD_BUTTON }).click();
    await dialog.getByRole("button", { name: "Добавить" }).click();
    await expect(main.getByText(ADDED_NOTICE)).toBeVisible();
    await expect(dialog).toBeHidden();

    // The same user again: the notice says they are already on the list.
    await row(BUTTON_USER).getByRole("button", { name: ADD_BUTTON }).click();
    await dialog.getByRole("button", { name: "Добавить" }).click();
    await expect(main.getByText(ALREADY_NOTICE)).toBeVisible();

    // The drop: a real pointer drag of the grip onto the link, then the other ground.
    await dragOnto(page, row(DROPPED_USER).getByRole("button", { name: `Переместить пользователя ${DROPPED_USER}` }), main.getByRole("link", { name: LIST_LINK }));
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(DROPPED_USER)).toBeVisible();
    await dialog.getByRole("radio", { name: new RegExp(MALICIOUS_GROUND) }).check();
    await dialog.getByRole("button", { name: "Добавить" }).click();
    await expect(main.getByText(ADDED_NOTICE)).toBeVisible();

    // FR-4, FR-5: the list, newest first, with each case's ground and status.
    await main.getByRole("link", { name: LIST_LINK }).click();
    await expect(page).toHaveURL(/\/admin\/violations$/);
    await waitForHydration(page);
    await expect(page.getByRole("navigation", { name: "Навигационная цепочка" })).toContainText("Админка");
    const rows = main.getByRole("listitem");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText(DROPPED_USER);
    await expect(rows.nth(0)).toContainText(MALICIOUS_GROUND);
    await expect(rows.nth(0).getByRole("button", { name: WARN_BUTTON })).toHaveCount(0);
    await expect(rows.nth(1)).toContainText(BUTTON_USER);
    await expect(rows.nth(1)).toContainText(HARMFUL_GROUND);
    await expect(rows.nth(1)).toContainText("Ожидает решения");
    await expect(rows.nth(1).getByRole("button", { name: WARN_BUTTON })).toBeVisible();

    // FR-7: the ground switch keeps the row, updates its pill and takes the warning away.
    await rows.nth(1).getByRole("button", { name: SWITCH_BUTTON }).click();
    await expect(rows.nth(1).getByText(GROUND_CHANGED_NOTICE)).toBeVisible();
    await expect(rows.nth(1)).toContainText(MALICIOUS_GROUND);
    await expect(rows.nth(1).getByRole("button", { name: WARN_BUTTON })).toHaveCount(0);

    // Clean up through the app.
    await rows.nth(1).getByRole("button", { name: REMOVE_BUTTON }).click();
    await expect(rows).toHaveCount(1);
    await rows.nth(0).getByRole("button", { name: REMOVE_BUTTON }).click();
    await expect(main.getByText(EMPTY_LIST)).toBeVisible();
  },
);
