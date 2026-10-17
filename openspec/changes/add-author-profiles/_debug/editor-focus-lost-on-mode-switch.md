# Keyboard focus falls to the page body when an editor field switches mode

- Change: `add-author-profiles`
- Called from: `web-qa`
- First seen: 2026-10-17
- Limit in force: `maxFixAttempts: 2`

## Failure

Gate 3's keyboard pass: on `/account/author`, pressing Enter on a field's «Изменить» shows the
input but leaves `document.activeElement` on `<body>`, so a keyboard user loses their place. The
same happens after «Отмена» and after a save: the focused button unmounts and nothing takes focus.

## Reproduce

1. Sign in as the owner (local stack, `editor-qa@example.com`), open `/account/author` with a saved
   first name.
2. Focus the first name's «Изменить» and press Enter → the «Имя» input renders;
   `document.activeElement.tagName` is `BODY`.
3. Click «Отмена» → `document.activeElement.tagName` is `BODY`.

Reproduced twice in a row in the Playwright MCP browser (steps 2 and 3, 2026-10-17).

## Attempt 1 — 2026-10-17

- Isolated to: `hooks/use-profile-field.ts` and the field editors (`NameFieldEditor`,
  `AboutFieldEditor`, `PhotoFieldEditor`) with their edit forms and `FieldActions`. Each mode
  switch replaces the subtree: the view's buttons unmount when edit mode starts, and the edit form
  unmounts on cancel or when an action settles. No element in the new subtree takes focus. Not an
  environment condition: deterministic, no network involved.
- Hypothesis: nothing moves focus on a mode switch. The edit forms mount their control without
  `autoFocus`, and the view-mode actions remount without it after a cancel or a settled action.
- Expected effect: opening a field focuses its control (the name input, the about textarea, the
  photo file input). «Отмена», a settled save or delete, and a photo save that fails all focus that
  field's first enabled view button («Изменить» or its add prompt). A failed name or about save
  focuses the input again. A first page load still focuses nothing, because the flag that asks for
  focus starts off false.
- What actually happened: opening a field now focuses the «Имя» input, and «Отмена» returns focus
  to that field's «Изменить». After a successful keyboard save («Сохранено» shown) focus is still
  on `BODY`.
- Verdict: still failing (the save half)

## Attempt 2 — 2026-10-17

- Reproduce changed to: only the settled action still drops focus; opening and Cancel pass.
- Isolated to: `useProfileField`'s `finish`, which sets the flag with a plain `setState` inside the
  async action. Cancel sets it synchronously in a click handler and works. An update made after the
  action's `await` doesn't commit together with the view's remount, so «Изменить» mounts while the
  flag is still false, and `autoFocus` only acts on mount.
- Hypothesis: the flag has to be true before the view's buttons remount. Setting it synchronously
  when the reader starts an action (in `submit` and `remove`, outside the transition) commits at
  once, while the pending view shows. The buttons that mount when the action settles then read
  `true`. A failed name or about save remounts the edit form instead, and its control focuses itself.
- Expected effect: after a keyboard save, focus is on that field's «Изменить». After a delete, it is
  on the field's add prompt. Opening and Cancel behave as in attempt 1.
- What actually happened: after a keyboard save («Сохранено» shown) focus is still on `BODY`.
  Opening and Cancel still pass.
- Verdict: still failing (the save half)

## Outcome

- Escalated: 2/2 attempts spent. Opening a field and «Отмена» now keep focus (verified in the
  browser); the settled save still drops it. The uncommitted fix covers the first two only.
- Not yet ruled out, for the next attempt: whether the field editors remount when the action's
  re-rendered RSC payload arrives (no `key` changes them, but the payload replaces the editor's
  props). That would reset `restoreFocus` with the rest of `useProfileField`'s state, so neither
  attempt's flag would survive. Check it with a mount counter in the field editor before changing
  anything. Another option: focus from an effect after the commit (a ref on the view's first
  button), not from `autoFocus` on mount.
- Spec case: not classified yet; the fix hasn't landed.

## Attempt 3 — 2026-10-17 (over the limit, user decision: "Ещё попытка")

- Reproduce changed to: the same keyboard save, with `focusin`/`focusout` listeners and a
  MutationObserver on `main` logging every mounted button. Log: `in Изменить`, `in INPUT`,
  `mount Сохранить`, `mount Отмена`, `out INPUT`, `mount Сохранение…[disabled]`, `mount Удалить`.
  «Изменить» is never mounted after the save.
- Isolated to: `FieldActions`. Its pending branch (`div > Button «Сохранение…»`) and its value
  branch (`div > Button «Изменить», Button «Удалить»`) share the same element types in the first
  position, so React reuses the pending button's DOM node for «Изменить». It only changes the text
  and drops `disabled`, and mounts just «Удалить». The delete branch («Удаление…» → the add prompt)
  has the same shape. The remount guess from the Outcome above is ruled out: the editor's
  «Сохранено» state survives, and no node but «Удалить» is new.
- Hypothesis: `autoFocus` never fires after an action because the button that should take focus is
  updated in place, not mounted. Attempt 2's flag was correct but never read at a mount.
- Expected effect: with distinct `key`s on the pending buttons and on the view buttons, React mounts
  «Изменить» or the add prompt fresh when the action settles, and `autoFocus` (flag true since the
  action started) moves focus there. Opening and Cancel behave as before.
- What actually happened: keyboard save of the first name → focus on «Изменить» in «Имя».
  A 61-character name → focus in the «Имя» input with `aria-invalid="true"`. Opening about → the
  textarea; Cancel → about's «Изменить». Opening the photo → the file input. Deleting the last name
  → «Добавить фамилию»; Enter there and a save → «Изменить» in «Фамилия». First load → `BODY`.
- Verdict: matched

## Outcome

- Fixed on attempt 3, past `maxFixAttempts: 2` by the user's explicit "Ещё попытка" (2026-10-17).
  The fix combines attempt 1 (`autoFocus` on each edit control, and on the view's first button
  behind a flag), attempt 2 (the flag set synchronously when an action starts), and attempt 3
  (distinct keys in `FieldActions`, so that button mounts fresh).
- Spec case: 3, no criterion covered this. NFR-5 gains a keyboard-focus bullet in `proposal.md`
  and the scenario "Keyboard focus follows the field's mode" in `specs/author-profiles/spec.md`,
  both tagged as added by defect fix.
- Criterion touched: `NFR-5`
