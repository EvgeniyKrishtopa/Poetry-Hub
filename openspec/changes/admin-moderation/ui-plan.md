# UI plan: admin-moderation

State names and component names come from `docs/design-system.md`; every existing name resolves to its file there
(checked against the tree). Values come from the approved Claude Design canvas (`proposal.md` `## Mockups`), read
from the artifact directly, so the value source is "Claude Design" with the artboard number.

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| Site header, admin link (group 5) | not signed in, session loading, session unreadable: unchanged (empty session block); signed in: «Наши авторы», «Личный кабинет», «Выйти»; admin: «Админка» added between «Личный кабинет» and «Выйти»; narrow admin header in three rows (logo; «Наши авторы»; «Личный кабинет», «Админка», «Выйти») | the header's existing nav link style (14px, 500, `foreground`, `accent` on hover); no button, no pill, no new colour; a slot on `HeaderAuthLinks` | Claude Design, artboard 1 |
| `/admin` user list (group 5) | default page 1; page 2 («Далее», «К первой странице»); last page (only «К первой странице»); filtered (one row, no page links); `loading` (title and filter in place, four skeleton rows, hidden «Загрузка…»); `empty` («Никого не нашли», muted, under the filter); `error` (danger `Alert` «Не удалось загрузить пользователей», title and filter stay); row pending (that row's buttons disabled at 50%) | `TextField` («Электронная почта», whole address) + `Button` `primary` «Найти»; rows: address 18px/500, state badge, muted author name, joined and last-sign-in dates; `Button` `ghost` «Заблокировать» / «Разблокировать» / «Отозвать сессии», `Button` `danger` «Забанить»; `ButtonLink` `ghost` page links, 8px apart; `Alert` per row; **new: `UserStateBadge`**, 12px pill, outline in the state colour: «Активен» `success`, «Заблокирован» `danger`, «Забанен» solid `danger` fill, «Админ» `accent`. Row actions by state: active — block, revoke, ban; blocked — unblock, revoke, ban; banned — revoke only; admin — none | Claude Design, artboards 41 (`AdminUsers`, `AdminUsersResults`, `AdminUsersFailures`, `AdminUsersStates`) |
| `/admin` row results and failures (group 5) | success inside the row, under the buttons, full width, and the row takes its new state at once: «Пользователь заблокирован», «Пользователь разблокирован», «Сессии отозваны»; neutral: «Сессий не было»; danger: «Уже заблокирован», «Не заблокирован», «Нельзя менять админа», «Пользователь не найден», «Сессия истекла, войдите снова», «Сервис недоступен» | `Alert` (`success`, `neutral`, `danger`) | Claude Design, artboard 41 |
| `/admin` ban confirmation (group 5) | closed; open («Забанить пользователя?», description names the email); pending (`closable={false}`, × and both buttons disabled); error (danger `Alert` above the buttons, dialog stays open, any of the action failure texts) | `Dialog`, `Button` `ghost` «Отмена», `Button` `danger` «Забанить»; buttons wrap below 600px | Claude Design, artboard 42 |
| `/admin` gate states (group 5) | signed out → `/login` (no screen); non-admin → the ordinary not-found screen («Страница не найдена», «На главную»), no breadcrumb trail; session or admin check unreadable → `SessionUnavailableAlert` in place of the page, no trail | `NotFound` state, `SessionUnavailableAlert` | Claude Design, artboard 43 |
| Poem page, admin delete control (group 6) | hidden (everyone else, and the admin on their own work); idle (danger «Удалить произведение (админ)» under the text, same size as the owner's «Удалить произведение»); confirming («Удалить произведение «<title>»?», «Это действие нельзя отменить.», «Отмена» ghost, «Удалить» danger); deleting (both buttons and × disabled); error (danger «Не удалось удалить» in the dialog); already gone (neutral «Произведение уже удалено» above the button) | `Button` `danger`, `Dialog`, `Alert` | Claude Design, artboard 44 (`AdminPoem`, `AdminPoemDialog`) |
| Collection page, admin delete control (group 6) | same six states: button «Удалить сборник (админ)» under the poems list; dialog «Удалить сборник «<title>»?», «Произведения из сборника останутся у автора как свободные.»; error «Не удалось удалить»; already gone «Сборник уже удалён» | same components | Claude Design, artboard 45 |
| Restricted-account message on write surfaces (group 4) | the surface's existing failure place, one text «Ваш аккаунт заблокирован: изменения недоступны.»: add and edit poem forms (above the button / under the title), delete poem dialog (inside, dialog stays open), new and edit collection forms, collection poems (above the list, checkmarks stay), the board (above the board; the dragged item returns, handles stay active), profile field editor (under the field, typed value stays, other fields disabled); input kept and no retry control everywhere | `Alert` (`danger`) or the field's own error line, no new component | Claude Design, artboards 46 (`BlockedPoems`, `BlockedCollections`, `BlockedProfile`) |
| Sign-in form, blocked account (group 4) | existing form-level `error`: «Аккаунт заблокирован.» above the form; typed address and password stay | `Alert` (`danger`) | Claude Design, artboard 47 |

## Criteria cover (acceptance criteria with a human-visible outcome)

- FR-2 (gate outcomes), FR-3 (list, paging, admin row without controls, filter), FR-4 / FR-5 / FR-6 / FR-7 and FR-12
  (one-click block, unblock, revoke; ban dialog; result and failure messages including "no sessions"), NFR-5
  (tokens and Russian copy only; accessibility is deliberately out of scope for the admin UI): `/admin` rows.
- FR-20 (header link for an admin only): the header row.
- FR-10 (control shown to an admin on others' work only, confirmation, cancel, redirect): the two public pages' rows.
- FR-14, FR-15, FR-18, FR-19 (restricted message on poem, collection, board, profile surfaces): the write-surfaces row.
- FR-16 (blocked sign-in message): the sign-in row. FR-17's neutral sign-up answer reuses the existing `check-email`
  screen and adds no screen.
- No gap found: every criterion with a visible outcome lands on at least one row. FR-1, FR-8, FR-9, FR-11, FR-13 and
  NFR-1, NFR-2, NFR-3, NFR-4, NFR-6 have no screen of their own (database, actions, build and lint rules).

## Notes

- Differences the mockups settled against the earlier plan: the header link sits in the session block (so
  `HeaderAuthLinks` gets a slot, design D13), row results and failures render inside the row, a banned row offers
  only «Отозвать сессии», and a blocked row offers «Разблокировать», «Отозвать сессии» and «Забанить».
- The mockups draw focus rings and focus return; the admin UI has no accessibility requirement, so those are not
  binding.
- `docs/design-system.md` records Commit `23ff8f1`; HEAD is `aab2d1c`. Every name used here still resolves, so the
  document is not treated as stale. The state badge adds no token (existing colours only).
- Russian copy lives in `admin-messages.ts` and each feature's messages file, not here.
