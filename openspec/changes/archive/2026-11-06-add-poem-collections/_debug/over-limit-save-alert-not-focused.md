# Over-limit save: the alert looked unfocused

- Change: `add-poem-collections`
- Called from: `web-qa`
- First seen: 2026-11-06
- Limit in force: `maxFixAttempts: 2`

## Failure

On `/account/poems/collections/<id>/edit`, the 11th save within a minute shows the `role="alert"`
«Слишком много сохранений. Попробуйте через минуту.» above the form, keeps the values, and stays on the
page, but a Gate 3 probe found the `role="alert"` element not focused (FR-11: a failure that keeps the
author on the edit page moves focus to the alert).

## Reproduce

A temporary Playwright probe (signed in as `author3@example.test`): create a collection, make 10 saves
on its edit page within a minute, then an 11th; assert `getByRole("main").getByRole("alert")` is
focused. Failed: `Received: inactive`.

The first run of the same probe was refused one save earlier than expected: the earlier "deleted in
another tab" probe's save had already counted one `collection_edit` attempt (FR-10 counts attempts
after the session check, before the update), so that was correct behaviour, not this failure.

## Attempt 1 — 2026-11-06

- Isolated to: the probe's assertion, not the app. `EditCollectionForm.tsx` renders the alert inside a
  `<div ref={alertRef} tabIndex={-1}>` wrapper and `use-edit-collection-form.ts` focuses that wrapper,
  the same structure as `poem-management`'s `EditPoemForm`; `EditCollectionForm.test.tsx` pins it with
  `expect(alert.parentElement).toHaveFocus()`. The `role="alert"` element itself is never the focus
  target, so asserting focus on it fails by construction.
- Hypothesis: no defect; focus lands on the alert's wrapper, which contains the alert text.
- Expected effect: with the probe asserting focus on the alert's parent, the 11th-save run passes
  (alert text, wrapper focused, value kept, still on `/edit`) with no code change.
- What actually happened: after the one-minute window reset, the probe passed with the parent
  assertion: 10 saves stored, the 11th refused with the alert text, its wrapper focused, the title
  kept, the URL still `/edit`. The cleanup step deleted every probe collection.
- Verdict: matched

## Outcome

- Not a defect: the probe asserted focus on the wrong element. No code change, no attempt spent on a fix.
- Spec case: skipped, because the app already meets FR-10 and FR-11 as written, and
  `EditCollectionForm.test.tsx` already pins the focus target.
