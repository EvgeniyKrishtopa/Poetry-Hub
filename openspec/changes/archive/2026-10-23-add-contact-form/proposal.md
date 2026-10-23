# Proposal

## Why

The footer's «Связаться с нами» link points at `/contact`, where no page answers: a visitor who
wants to reach the site's owner lands on the not-found screen (`site-footer` FR-4). The owner
wants requests where they already are, in Telegram, without a mailbox or an admin screen to
check (user request, 2026-10-23).

## What Changes

- «Связаться с нами» in the footer becomes a button that opens a modal dialog with a contact
  form, appearing with a short fade-and-rise animation. The page underneath doesn't change and
  the URL stays the same.
- The form has three fields, «Имя», «Электронная почта», «Ваше сообщение», and a «Отправить»
  button. One Zod schema checks them: in the browser before anything is sent, and again in the
  Server Action, which treats the browser's check as untrusted.
- On submit, a Server Action sends one Telegram message to the owner's chat through the
  Telegram Bot API (`sendMessage`). The bot token and chat id are server-only environment
  variables, never `NEXT_PUBLIC_` and never logged (user decision, 2026-10-23). Submissions are
  not stored anywhere else.
- The dialog shows a sending state, then a thank-you message on success, or an error alert
  that keeps what was typed on failure.
- A hidden honeypot field turns away simple bots: a submission that fills it gets the normal
  thank-you message, and nothing is sent.
- `SiteFooter` renders the contact feature's dialog button itself, through `@/features/contact`;
  its callers don't change. `FOOTER_LINK_PATHS`, `FOOTER_LINK_ORDER`, and
  `FOOTER_LINK_LABELS` drop `contact`. The footer itself stays a cached Server Component, and
  its link look becomes one class, `FOOTER_LINK_CLASS`, which the button uses too.
- `/contact` is no longer planned (user decision, 2026-10-23): every placeholder for it goes,
  namely the path constant, the link, the footer test's expectation, and the two recorded
  browser scenarios that check its 404. Nothing on the site refers to it any more.
- A new infrastructure client, `shared/lib/telegram`, sends a text message with a timeout and
  reports failures as plain values.

## UI copy

Every new user-facing string, verbatim.

| Key | Text |
| --- | --- |
| Footer button (opens the dialog) | `Связаться с нами` (the existing label) |
| Dialog title | `Связаться с нами` |
| Dialog intro | `Напишите нам, и мы ответим на указанную почту.` |
| Close button, accessible name (the visible mark is `×`) | `Закрыть` |
| Field label: name | `Имя` |
| Field label: email | `Электронная почта` |
| Field label: message | `Ваше сообщение` |
| Submit button | `Отправить` |
| Submit button while sending | `Отправка…` |
| Error: name empty | `Введите имя` |
| Error: name too long | `Имя должно быть не длиннее 80 символов` |
| Error: email invalid or empty | `Введите корректный адрес электронной почты` |
| Error: email too long | `Адрес почты должен быть не длиннее 254 символов` |
| Error: message too long | `Сообщение должно быть не длиннее 300 символов` |
| Send failure alert | `Не удалось отправить сообщение. Попробуйте ещё раз позже.` |
| Success message | `Спасибо! Ваше сообщение отправлено.` |
| Success state button | `Закрыть` |

The Telegram message the owner receives (not shown on the site) is plain text:

```
Новое сообщение с сайта <site name>
Имя: <name>
Почта: <email>

<message>
```

## Requirements

- **FR-1** — The footer's navigation landmark «Информация о проекте» holds, in order, the
  «О проекте» link, the «Политика конфиденциальности» link, and a «Связаться с нами» button
  (`<button type="button">`, `aria-haspopup="dialog"`) that looks exactly like the links in
  every state (at rest, hover, focus): same colour, size, and focus outline, no button
  background, border, or padding. Activating it
  (click, Enter, or Space) opens the contact dialog as a modal: the page behind can't be
  reached by pointer or keyboard while it is open, and focus moves to the «Имя» field.
- **FR-2** — The dialog appears with a fade and a rise: opacity from 0 to 1 and an upward shift
  of 8 px to 0, over 200 ms, ease-out; its backdrop fades in over the same 200 ms. Closing plays
  the reverse over the same time. When the visitor's system asks for reduced motion
  (`prefers-reduced-motion: reduce`), the dialog opens and closes with no animation.
- **FR-3** — The dialog holds, in order: the title «Связаться с нами» (its accessible name), the
  intro line, the fields «Имя» (a single-line input), «Электронная почта» (an email input), and
  «Ваше сообщение» (a multi-line text area), then the «Отправить» button. A close button named
  «Закрыть» sits in its top corner.
- **FR-4** — The dialog closes on the «Закрыть» button, on Escape, and on a click on the backdrop
  outside the dialog box; then focus returns to the footer's «Связаться с нами» button. Values
  typed and not yet sent are kept if the dialog is closed and opened again, until the page is
  reloaded; error messages from the last submit are kept with them.
- **FR-5** — Validation, by one Zod schema. Each value is trimmed of leading and trailing
  whitespace first. Rules: name 1–80 characters; email a valid address by Zod's `z.email()`,
  at most 254 characters; message optional, at most 300 characters (user decision, 2026-10-23). On «Отправить», the browser checks the
  values against the schema before sending anything; each invalid field shows its error
  message (UI copy table) under it, and focus moves to the first invalid field. A field's
  error stays until the next submit, and disappears the moment «Отправить» is activated (not
  when the answer arrives). The Server Action validates the same schema again and
  sends nothing when it fails.
- **FR-6** — Delivery. A submission that passes validation is sent by a Server Action as exactly
  one Telegram Bot API `sendMessage` call to the configured chat, holding the trimmed values in
  the format above, as plain text (no `parse_mode`, so nothing in the text is read as markup).
  When the message is empty after trimming, the text ends after the `Почта:` line (no empty
  line, no message block).
- **FR-7** — Sending state. From the submit until the action's answer, the submit button reads
  «Отправка…» and is disabled, so a second click sends nothing more, and the three fields are
  disabled too, so nothing typed during sending can be lost when the answer arrives.
- **FR-8** — Success. When Telegram accepts the message, the form is replaced by the message
  «Спасибо! Ваше сообщение отправлено.» and a «Закрыть» button, which closes the dialog. The
  first time the dialog opens after the visitor has closed the thank-you view, it shows an
  empty form with no error messages. If the success arrives while the dialog is closed, the
  next open still shows the thank-you view (so the visitor learns the message went through),
  and the empty form comes on the open after that one is closed.
- **FR-9** — Failure. When the message can't be delivered (the bot settings are missing or
  malformed, Telegram can't be reached, it doesn't answer within 10 seconds, it answers
  with an error, or the browser's request to the Server Action itself fails with no result),
  the dialog stays open on the form with the alert «Не удалось отправить
  сообщение. Попробуйте ещё раз позже.» above the fields; the page is never replaced by an error
  screen, the typed values stay, focus moves to the «Отправить» button, and the visitor can
  submit again. The alert disappears the moment «Отправить» is activated again, on the
  next submit. Each failed delivery that reaches the action writes exactly one server log line, `[contact] send failed`, with the reason (`config`, `network`,
  `timeout`, `http`) and, for `http`, the HTTP status, and nothing else.
- **FR-10** — Honeypot. The form has one extra text field, `website`, hidden from people (off
  screen, out of the tab order, hidden from assistive tech, autocomplete off). When it arrives
  non-empty, the action sends nothing, logs nothing, and answers exactly as on success (FR-8).
- **FR-11** — Anyone can send, signed in or not; the action reads no session.
- **FR-12** — Nothing refers to `/contact`: no route, no path constant, no link, and no test
  or recorded browser scenario expects anything at that path.
- **FR-13** — The backdrop dims the page in both colour schemes and never lightens it. In
  the light scheme it is the `foreground` colour at 40% opacity; in the dark scheme it is the
  `background` colour (near black) at 70% opacity, so no part of the page behind the dialog
  becomes lighter than it was (user request, 2026-10-23). Both come from one new design token,
  `--backdrop`, defined in `src/app/globals.css` for each scheme from the existing tokens.
- **NFR-1** — Secrets. The bot token and chat id are read only on the server, from
  `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` (no `NEXT_PUBLIC_` prefix), inside
  `shared/lib/telegram`, whose modules start with `import "server-only"`. Neither value, nor the
  request URL that carries the token, appears in any log line, error message, action result, or
  client bundle. `.env.example` lists both by name only.
- **NFR-2** — Visitor data stays out of logs: no log line holds the submitted name, email, or
  message. The feature's action client logs only an error's `name` (the shared
  `createActionClient` policy).
- **NFR-3** — One schema: `model/contact.schema.ts` is the only validation of the three fields.
  The form checks it before sending, and the action uses it as its input schema.
- **NFR-4** — Styling uses named design-token utilities only. No colour literals, and no
  Tailwind arbitrary-value colour class (`text-[…]`, `bg-[…]`, `border-[…]`, …), even one that
  wraps a token variable.
- **NFR-5** — `SiteFooter` stays a Server Component with its own `"use cache"` scope and no
  `"use client"`; it renders the contact Client Component with a constant prop only, so the
  cache key does not change. `npm run build` reports no route as fully dynamic (`ƒ`) that wasn't
  before.
- **NFR-6** — Named constants: the length limits, the request timeout, the honeypot field name,
  and the environment variable names are named constants; no magic values.
- **NFR-7** — Documentation: `docs/architecture.md` lists `features/contact/`,
  `shared/lib/telegram/`, and `site-footer`'s import of the contact dialog; `docs/environment.md`
  describes `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, how to get them, and the hosting-level
  rate limit as a deploy step.

## Acceptance Criteria

- **FR-1:** GIVEN any page, WHEN the footer's navigation landmark is queried, THEN it holds the
  links «О проекте» (`/about`) and «Политика конфиденциальности» (`/privacy`), then a button
  «Связаться с нами» with `aria-haspopup="dialog"`. WHEN the visitor activates that button,
  THEN a modal dialog named «Связаться с нами» is open, the «Имя» field has focus, and Tab
  never moves focus outside the dialog.
- **FR-2:** GIVEN a browser with no reduced-motion preference, WHEN the dialog opens, THEN its
  computed `transition` covers `opacity` and `transform` with a 200 ms duration and it ends at
  opacity 1 with no transform. GIVEN `prefers-reduced-motion: reduce`, WHEN the dialog opens,
  THEN its computed transition duration is 0 s.
- **FR-3:** GIVEN the dialog is open, WHEN its contents are read in order, THEN they are the
  heading «Связаться с нами», the intro line, a text input labelled «Имя», an email input
  labelled «Электронная почта», a text area labelled «Ваше сообщение», and the button
  «Отправить»; a button named «Закрыть» is present.
- **FR-4:** GIVEN the dialog is open with «Имя» typed as `Анна`, WHEN the visitor presses
  Escape, THEN the dialog is closed and focus is on «Связаться с нами»; WHEN they reopen it,
  THEN «Имя» still holds `Анна`. The same holds for the «Закрыть» button and for a click on
  the backdrop.
- **FR-5:** GIVEN the form with name `   `, email `not-an-email`, and message empty, WHEN the
  visitor activates «Отправить», THEN no request reaches the Server Action, the two errors
  «Введите имя» and «Введите корректный адрес электронной почты» are shown under their fields,
  «Ваше сообщение» shows no error, and focus is on «Имя». GIVEN a valid name and email and an
  empty or whitespace-only message, WHEN submitted, THEN it passes validation and is sent. GIVEN a name of 81 characters, WHEN
  submitted, THEN «Имя должно быть не длиннее 80 символов» is shown. GIVEN a message of 301
  characters, WHEN submitted, THEN «Сообщение должно быть не длиннее 300 символов» is shown;
  300 characters pass.
  GIVEN the Server Action is called directly with an invalid email, WHEN it runs, THEN it
  returns validation errors and makes no Telegram request.
- **FR-6:** GIVEN valid values `  Анна  `, `anna@example.com`, and `Привет!\n<b>стихи</b>`,
  WHEN the action runs with working bot settings, THEN exactly one `sendMessage` request goes
  to the Telegram Bot API with the configured `chat_id`, no `parse_mode`, and the text
  `Новое сообщение с сайта Поэтический Хаб\nИмя: Анна\nПочта: anna@example.com\n\nПривет!\n<b>стихи</b>`.
  GIVEN the same name and email and a message of `   `, WHEN the action runs, THEN the text is
  `Новое сообщение с сайта Поэтический Хаб\nИмя: Анна\nПочта: anna@example.com`.
- **FR-7:** GIVEN valid values and an action that hasn't answered yet, WHEN the visitor clicks
  «Отправить» again, THEN the button reads «Отправка…», is disabled, the three fields are
  disabled, and the action has been called once.
- **FR-8:** GIVEN Telegram accepts the message, WHEN the action answers, THEN the dialog shows
  «Спасибо! Ваше сообщение отправлено.» (`role="status"`) and a «Закрыть» button, and no form
  fields; WHEN the visitor closes it and opens the dialog again, THEN every field is empty and
  no error is shown.
- **FR-9:** GIVEN Telegram answers HTTP 500 (or the request fails, takes over 10 s, or a bot
  variable is missing), WHEN the visitor submits valid values, THEN the alert «Не удалось
  отправить сообщение. Попробуйте ещё раз позже.» (`role="alert"`) is shown, the fields keep
  their values, and the server logged exactly one `[contact] send failed` line holding only
  the reason (and status 500 for `http`), with no token, chat id, URL, name, email, or
  message. GIVEN the call to the Server Action rejects with no result (network down, hosting
  429), WHEN the visitor submits valid values, THEN the same alert is shown, the fields keep
  their values, and the page is not replaced by an error screen.
- **FR-10:** GIVEN the `website` field holds `http://spam.example`, WHEN the action runs with
  otherwise valid values, THEN it makes no Telegram request, logs nothing, and the dialog
  shows the success message.
- **FR-11:** GIVEN a signed-out visitor, WHEN they submit valid values, THEN the message is
  delivered (FR-6) and the success message is shown.
- **FR-12:** GIVEN the change is complete, WHEN `src/` and `tests/web-qa-scenarios/` are
  searched for the string `/contact`, THEN there is no match; WHEN the rendered HTML of `/` is
  searched for `href="/contact"`, THEN there is no match.
- **FR-13:** GIVEN the dark colour scheme, WHEN the dialog is open, THEN the backdrop's
  computed background colour is `background` (`#0a0a0a`) at 70% opacity, and a page area that
  was `surface` (`#18181b`) or `foreground` text (`#ededed`) reads darker through the backdrop
  than without it. GIVEN the light scheme, WHEN the dialog is open, THEN the backdrop is
  `foreground` (`#171717`) at 40% opacity.
- **NFR-1:** GIVEN the change is complete, WHEN `src/` is searched, THEN `TELEGRAM_BOT_TOKEN`
  and `TELEGRAM_CHAT_ID` are read only in `src/shared/lib/telegram/` (excluding tests), every
  module there starts with `import "server-only"`, and no identifier `NEXT_PUBLIC_TELEGRAM`
  exists; WHEN the built client chunks under `.next/static` are searched for the local token
  value, THEN there is no match.
- **NFR-2:** GIVEN the action fails in every way FR-9 lists, plus an unexpected throw, WHEN
  `console.error` calls are captured, THEN none holds the submitted name, email, or message.
- **NFR-3:** GIVEN the change is complete, WHEN `src/features/contact/` (excluding tests) is
  searched for `z.object(`, THEN there is one match, in `model/contact.schema.ts`, and both the
  form's submit helper and the action import that schema.
- **NFR-4:** GIVEN the change is complete, WHEN `src/features/contact/` (excluding `tests/`) is
  searched for hex, `rgb(`, `hsl(` literals and the regex
  `-\[(#|rgb|hsl|oklch|var\(--color|color:)`, THEN there are no matches.
- **NFR-5:** GIVEN the change is complete, WHEN `src/features/site-footer/` is searched for
  `"use client"`, THEN there is no match, `SiteFooter` still opens with `"use cache"`, and the
  `npm run build` route table marks the same routes `ƒ` as on `main` before the change.
- **NFR-6:** GIVEN the change is complete, WHEN `src/features/contact/` and
  `src/shared/lib/telegram/` (excluding tests) are searched for the literals `80`, `254`,
  `300`, `10000`, `10_000`, and `"website"` as standalone numbers or strings (not inside a
  Tailwind class), THEN each appears only in a constant's definition in a `*.constants.ts` file;
  the error messages that mention a limit interpolate its constant.
- **NFR-7:** GIVEN the change is complete, WHEN the two docs are read, THEN `architecture.md`
  lists `features/contact/`, `shared/lib/telegram/`, and `site-footer`'s import of the contact dialog, and
  `environment.md` describes both variables, how to obtain them, and the per-IP rate limit
  deploy step.

## Capabilities

### New Capabilities

- `contact-form`: the contact dialog, its form and validation, delivery to Telegram, and its
  failure and anti-spam behaviour.

### Modified Capabilities

- `site-footer`: FR-3's third item becomes the «Связаться с нами» button, styled exactly like
  the links, instead of a `/contact` link, and FR-3 takes over the about and privacy link
  scenarios; FR-4 («Placeholder targets until the pages exist») is removed, since no footer
  item points at a missing page any more.

## Out of Scope

- A `/contact` page, or a URL that opens the dialog: not planned (user decision, 2026-10-23).
- Storing submissions (Supabase or elsewhere), an admin view, or replies from the site.
- Per-IP or per-visitor rate limiting inside the app: per ADR 0007 point 5 that is the hosting
  layer's job (Vercel Firewall or Cloudflare rules covering Server Action POSTs), recorded as a
  deploy step. A CAPTCHA.
- Sending a copy to the visitor, or any email.
- Pre-filling name or email for a signed-in reader.
- Updating the privacy policy text to mention Telegram as a processor: the editorial side
  edits it in Contentful (see design Risks).

## Impact

- `src/features/contact/` (new): `actions/`, `model/`, `components/ContactDialog/`,
  `components/ContactForm/`, `tests/`, `index.ts`.
- `src/shared/lib/telegram/` (new): server-only config reader and `sendTelegramMessage`.
- `src/features/site-footer/`: `SiteFooter` renders `ContactDialog`; constants and messages
  drop `contact`; `FOOTER_LINK_CLASS` (new); its doc comment and tests updated.
- `src/app/globals.css`: a new `--backdrop` token for each colour scheme (FR-13).
- `tests/web-qa-scenarios/about-footer-links.spec.ts` and `site-footer-on-every-page.spec.ts`:
  their `/contact` expectations are removed or replaced by the button.
- `.env.example`: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (names only).
- `docs/architecture.md`, `docs/environment.md`.
- No new dependencies (Zod, next-safe-action, and `fetch` are already available), no schema
  change.

## Mockups

| Screen | Link |
| --- | --- |
| Footer button «Связаться с нами» (rest, hover, focus) and the contact dialog (2a at rest, 2b validation errors incl. long variants, 2c sending, 2d send failed, 2e sent); light and dark, 1280 px and 375 px | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#page-dcb81aee8d83, artboard «10 · Связаться с нами — подвал и диалог» (`project/Contact.dc.html`) |
