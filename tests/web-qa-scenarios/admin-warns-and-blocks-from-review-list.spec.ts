// pages: /login, /admin, /admin/violations
import { expect, test, type Page } from "@playwright/test";

import { waitForHydration } from "./support/hydration";
import { signIn } from "./support/sign-in";

/** `draft-author@example.test`: the seeded admin. */
const ADMIN_EMAIL = "draft-author@example.test";
/** A seed reader no other scenario touches; blocked and unblocked again by this one. */
const USER_EMAIL = "author4@example.test";

const ADD_BUTTON = "В список нарушителей";
const WARN_BUTTON = "Отправить предупреждение";
const SWITCH_BUTTON = "Сменить основание";
const BLOCK_BUTTON = "Заблокировать";
const REMOVE_BUTTON = "Убрать из списка";
const WARN_DIALOG_TITLE = "Предупреждение пользователю";
const EARLY_BLOCK_TITLE = "Заблокировать до истечения срока?";
const NOT_WARNED_LINE = "Предупреждение ещё не отправлено.";
const EMPTY_MESSAGE_ERROR = "Введите сообщение";
const CASE_GONE = "Случая больше нет";
const EMPTY_LIST = "В списке никого нет";
const OFFLINE_TEXT = "Нет подключения к интернету";
const UNBLOCK_BUTTON = "Разблокировать";

async function addToReviewList(page: Page, email: string): Promise<void> {
  await page.goto("/admin");
  await waitForHydration(page);
  const main = page.getByRole("main");
  await main.getByRole("listitem").filter({ hasText: email }).getByRole("button", { name: ADD_BUTTON }).click();
  await page.getByRole("dialog", { name: "Добавить в список нарушителей?" }).getByRole("button", { name: "Добавить" }).click();
  await expect(main.getByText("Пользователь добавлен в список нарушителей")).toBeVisible();
}

// Leaves the seed as it found it: the case is closed by the block and the user is unblocked again through the app.
// The block sends the standard email, so with real email settings the line ends «Письмо отправлено» and without them
// «но письмо не отправлено»: both are the action done, which is all this scenario asserts.
// implements FR-6, FR-8, FR-15 of admin-violations-feedback: the warning dialog's checks, offline, a case removed in
// another tab, and the early block confirmation.
test(
  "an admin checks a warning, loses the connection, meets a case removed in another tab, then blocks early",
  { tag: ["@admin-violations-feedback"] },
  async ({ page, context }) => {
    await signIn(page, ADMIN_EMAIL);
    await addToReviewList(page, USER_EMAIL);

    await page.goto("/admin/violations");
    await waitForHydration(page);
    const main = page.getByRole("main");
    const row = main.getByRole("listitem").filter({ hasText: USER_EMAIL });
    await expect(row).toContainText("Ожидает решения");

    // FR-6: the dialog shows the address read-only, refuses an empty message, and forgets the text when cancelled.
    await row.getByRole("button", { name: WARN_BUTTON }).click();
    const warnDialog = page.getByRole("dialog", { name: WARN_DIALOG_TITLE });
    await expect(warnDialog.getByLabel("Кому")).toHaveValue(USER_EMAIL);
    await expect(warnDialog.getByLabel("Кому")).toHaveAttribute("readonly", "");
    await warnDialog.getByRole("button", { name: "Отправить" }).click();
    await expect(warnDialog.getByText(EMPTY_MESSAGE_ERROR)).toBeVisible();
    await warnDialog.getByLabel("Сообщение").fill("Черновик, который не должен остаться.");
    await warnDialog.getByRole("button", { name: "Отмена" }).click();
    await expect(warnDialog).toBeHidden();
    await row.getByRole("button", { name: WARN_BUTTON }).click();
    await expect(warnDialog.getByLabel("Сообщение")).toHaveValue("");
    await warnDialog.getByRole("button", { name: "Отмена" }).click();

    // FR-15: no connection shows one notice above the list and disables the row's buttons; coming back enables them.
    await context.setOffline(true);
    // The row's closed dialogs hold the same notice, so the first one is the list's, above the rows.
    await expect(main.getByText(OFFLINE_TEXT).first()).toBeVisible();
    await expect(row.getByRole("button", { name: BLOCK_BUTTON })).toBeDisabled();
    await expect(row.getByRole("button", { name: REMOVE_BUTTON })).toBeDisabled();
    await context.setOffline(false);
    await expect(main.getByText(OFFLINE_TEXT).first()).toBeHidden();
    await expect(row.getByRole("button", { name: BLOCK_BUTTON })).toBeEnabled();

    // FR-15: the case is removed in a second tab; this tab's next action says it is gone and closes the row.
    const otherTab = await context.newPage();
    await otherTab.goto("/admin/violations");
    await waitForHydration(otherTab);
    await otherTab
      .getByRole("main")
      .getByRole("listitem")
      .filter({ hasText: USER_EMAIL })
      .getByRole("button", { name: REMOVE_BUTTON })
      .click();
    await expect(otherTab.getByRole("main").getByText(EMPTY_LIST)).toBeVisible();
    await otherTab.close();

    await row.getByRole("button", { name: SWITCH_BUTTON }).click();
    await expect(row.getByText(CASE_GONE)).toBeVisible();
    await expect(row.getByRole("button", { name: SWITCH_BUTTON })).toHaveCount(0);

    // FR-8: a harmful-content case with no warning asks before a block, and blocks on confirm.
    await addToReviewList(page, USER_EMAIL);
    await page.goto("/admin/violations");
    await waitForHydration(page);
    await row.getByRole("button", { name: BLOCK_BUTTON }).click();
    const earlyDialog = page.getByRole("dialog", { name: EARLY_BLOCK_TITLE });
    await expect(earlyDialog.getByText(NOT_WARNED_LINE)).toBeVisible();
    await earlyDialog.getByRole("button", { name: "Отмена" }).click();
    await expect(earlyDialog).toBeHidden();
    await expect(row.getByRole("button", { name: BLOCK_BUTTON })).toBeVisible();

    await row.getByRole("button", { name: BLOCK_BUTTON }).click();
    await earlyDialog.getByRole("button", { name: BLOCK_BUTTON }).click();
    await expect(row.getByText(/^Пользователь заблокирован/)).toBeVisible();
    await expect(row.getByRole("button", { name: BLOCK_BUTTON })).toHaveCount(0);

    // The block closed the case: a fresh load of the list no longer has the row.
    await page.reload();
    await waitForHydration(page);
    await expect(main.getByText(EMPTY_LIST)).toBeVisible();

    // Restore the seed: unblock the user on /admin.
    await page.goto("/admin");
    await waitForHydration(page);
    const userRow = main.getByRole("listitem").filter({ hasText: USER_EMAIL });
    await userRow.getByRole("button", { name: UNBLOCK_BUTTON }).click();
    await expect(userRow.getByText("Пользователь разблокирован")).toBeVisible();
  },
);
