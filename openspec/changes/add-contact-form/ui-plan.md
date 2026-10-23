# UI Plan

State names and existing components come from `docs/design-system.md`. Values come from the
approved Claude Design mockup, artboard «10 · Связаться с нами — подвал и диалог»
(`project/Contact.dc.html`, see `proposal.md` § Mockups); `ui-plan` pulls node values only from
Figma/Pencil, so they were taken from the artifact by hand (source: Claude Design). The design
system has no dialog, textarea field, or in-component pending pattern; the rows say so instead
of naming one.

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| Footer item «Связаться с нами» (every page, footer nav) | at rest (`muted`), hovered (`accent`), focused (2 px `accent` outline, 2 px offset): the footer links' states (FR-1) | **New: `ContactDialog`** (`src/features/contact/components/ContactDialog/`), reason: a dialog with its trigger, which the design system lacks. The trigger is a `<button type="button" aria-haspopup="dialog">` with `site-footer`'s `FOOTER_LINK_CLASS` through `triggerClassName`, plus the button reset the mockup's `.ftr-btn` shows (no background, border, padding, or margin; `font: inherit`; `cursor: pointer`), placed by `SiteFooter` (`src/features/site-footer/components/SiteFooter/`) after the two links | Claude Design, `Contact.dc.html` state 1 (`.ftr-btn`) |
| Contact dialog: form (modal over any page) | at rest, focus on «Имя» (2a, FR-3); opening/closing: opacity 0→1 and 8 px rise, 200 ms ease-out, backdrop fades over 200 ms, none under reduced motion (FR-2); error: inline `text-danger` field errors (2b, FR-5) and a form-level danger `Alert` above the fields (2d, FR-9), the design system's two in-component error patterns; loading: no shared in-component pattern, so the button reads «Отправка…» and the button and three fields are disabled at 50% (2c, FR-7) | **New: `ContactForm`** (`src/features/contact/components/ContactForm/`), reason: the form body and its state mapping. Backdrop: `--backdrop` (light `foreground` 40%, dark `background` 70%, FR-13), content centred with a 16 px gutter. Box: `w-full max-w-lg` (512 px), `rounded-2xl` (16 px), `border border-border bg-background text-foreground`, padding 24 px (`p-6`) from 600 px and 20 px (`p-5`) below, `flex flex-col gap-4`. Close: `×` button top 12 px / right 12 px, 36×36, `rounded-full`, transparent, `hover:bg-surface`, glyph 22 px, `aria-label` «Закрыть»; header keeps 40 px clear on the right. Header: title `h2` 20/28 `font-semibold` (`text-xl`), intro 14/20 `text-muted` (`text-sm`), 4 px apart. Form: `flex flex-col gap-4 items-start`, fields stretch. Reused: `TextField` (`src/shared/ui/TextField/TextField.tsx`) for «Имя» and «Электронная почта»; `FIELD_INPUT_CLASS` (`src/shared/ui/TextField/text-field-classes.ts`) on the «Ваше сообщение» textarea (`rows={5}`, about 118 px tall, `resize-y`) with the same label/error wiring; `Button` `primary` (`src/shared/ui/Button/Button.tsx`), left-aligned, not full width; `Alert` tone `danger` (`src/shared/ui/Alert/Alert.tsx`) | Claude Design, `Contact.dc.html` states 2a–2d (`.backdrop`, `.dlg`, `.x`, `.dlg-head`, `.form`, `.fld`, `.input`, `.ferr`, `.alert`) |
| Contact dialog: sent (same modal) | success: the title stays, the intro is hidden; `Alert` tone `success` (`role="status"`) «Спасибо! Ваше сообщение отправлено.», then `Button` `primary` «Закрыть» with focus (2e, FR-8) | `ContactForm`'s success branch (no new component); `Alert` (`src/shared/ui/Alert/Alert.tsx`), `Button` (`src/shared/ui/Button/Button.tsx`) | Claude Design, `Contact.dc.html` state 2e |

## Differences from the mockup kept on purpose

- Field label-to-input gap: the mockup has 6 px; `TextField` has 4 px (`gap-1`). Kept: changing
  the shared primitive would restyle every form in the app.
- Input text size: the mockup draws 14 px; `TextField` inputs use the inherited 16 px, which
  also keeps iOS Safari from zooming on focus. Kept for the same reason.

## Criteria with a visible outcome

FR-1, FR-2, FR-3, FR-4, FR-5, FR-7, FR-8, FR-9, FR-10 (the honeypot stays invisible), FR-11
(same form for a signed-out visitor), FR-12 (no footer item links to `/contact`), and FR-13 (the
backdrop) each land on a row above. FR-6 (the Telegram text) and the NFRs have no on-site
visual outcome.
