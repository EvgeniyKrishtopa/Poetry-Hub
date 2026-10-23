# Design

## Context

- `SiteFooter` (`features/site-footer`) is an async Server Component that owns a `"use cache"`
  scope (`cacheLife("days")`) for the copyright year. Its nav maps `FOOTER_LINK_ORDER` over
  `FOOTER_LINK_PATHS` into `next/link` links; `contact` points at `/contact`, which has no page
  (`site-footer` FR-4).
- The root layout (`app/layout.tsx`) renders `<SiteFooter />` after the page, inside
  `Providers`.
- Forms in the project (`auth`'s `SignInForm`) use React 19 `useActionState` with a submit helper
  that calls a next-safe-action Server Action and maps its result into a discriminated form
  state; inputs are uncontrolled with `defaultValue` from the state, so React's post-action
  form reset restores them. `createActionClient` (`shared/lib/safe-action`) logs only an
  error's `name` and returns a generic message.
- `shared/ui` has `TextField` (input + label + error wiring), `FIELD_INPUT_CLASS` (the input look
  for elements `TextField` can't render), `Button`, and `Alert`. No dialog primitive exists.
- No Telegram code exists. Infrastructure clients for external services live in `shared/lib`
  from their first consumer (`docs/architecture.md`).
- ADR 0007, point 5: per-IP flood protection is the hosting layer's job; app-level limits cover
  signed-in writes only.
- Next.js `"use cache"` lets JSX slots pass through a cached component without becoming part of
  its cache key, as long as the cached body doesn't read them ("Interleaving" in the
  `use cache` directive docs).

## Goals / Non-Goals

**Goals**

- Footer button opens an animated modal contact form; a valid submission reaches the owner's
  Telegram chat through a Server Action.
- The bot token and chat id never leave the server; no visitor data in logs.
- One Zod schema for browser and server validation.
- The footer stays a cached Server Component; no page becomes dynamic.

**Non-Goals**

- Storing submissions, an admin view, a `/contact` page.
- App-level rate limiting or CAPTCHA (hosting layer, ADR 0007 point 5).
- A shared `Dialog` primitive in `shared/ui`: one consumer so far.

## Decisions

### D1 — Module layout

```
src/shared/lib/telegram/
├── config.ts                    # readTelegramConfig(): TelegramConfigResult; server-only
├── client.ts                    # sendTelegramMessage(text): Promise<TelegramSendResult>; server-only
├── telegram.constants.ts        # env var names, API base URL, TELEGRAM_REQUEST_TIMEOUT_MS = 10_000, token/chat-id patterns
├── telegram.types.ts            # TelegramConfig, TelegramConfigResult, TelegramSendResult, TelegramFailureReason
├── index.ts                     # sendTelegramMessage + types (server-only module, imported by subpath like supabase/server)
└── tests/

src/features/contact/
├── actions/action-client.ts     # contactActionClient = createActionClient({ logPrefix: "contact", … }); server-only
├── actions/contact.actions.ts   # "use server": sendContactMessageAction
├── model/contact.constants.ts   # NAME_MAX_LENGTH 80, EMAIL_MAX_LENGTH 254, MESSAGE_MAX_LENGTH 300, HONEYPOT_FIELD "website"
├── model/contact.schema.ts      # contactMessageSchema (the only field validation, NFR-3), ContactMessageInput
├── model/contact.types.ts       # ContactSendResult, ContactFormValues, ContactFieldErrors, ContactFormState
├── model/contact-messages.ts    # every UI string of the proposal's copy table
├── model/format-contact-message.ts # formatContactMessage(input, siteName): the Telegram text (FR-6)
├── model/form-state.ts          # readContactValues(formData), toContactFormState(actionResult, values)
├── components/ContactDialog/    # "use client": trigger button + <dialog>; ContactDialog.module.css (FR-2)
├── components/ContactForm/      # "use client": the form (useActionState) + submit-contact.ts, success view
├── tests/
└── index.ts                     # export { ContactDialog }
```

- `shared/lib/telegram` knows nothing about contact forms: it sends a text to the configured
  chat. The contact feature owns the format, validation, logging, and UI.
- `index.ts` of `shared/lib/telegram` starts with `import "server-only"` too, so a client import
  fails the build (NFR-1).

*Alternatives considered:* Telegram code inside `features/contact/dal/`. Rejected: the
architecture doc puts external-service clients in `shared/lib` from the first consumer, and a
later feature (e.g. an alert on a new author) would reuse it.

### D2 — Telegram client

```ts
type TelegramFailureReason = "config" | "network" | "timeout" | "http";
type TelegramSendResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: TelegramFailureReason; readonly status?: number };
```

- `readTelegramConfig()` reads `process.env.TELEGRAM_BOT_TOKEN` and `process.env.TELEGRAM_CHAT_ID`
  on each call (lazy, like the Contentful and Supabase configs) and returns
  `{ ok: true, config } | { ok: false }`. Valid token: `^\d+:[A-Za-z0-9_-]+$`; valid chat id: an
  integer, optionally negative (`^-?\d+$`, groups and channels have negative ids). Missing or
  malformed → `{ ok: false }`; it never names or echoes a value.
- `sendTelegramMessage(text)`: config failure → `{ ok: false, reason: "config" }` with no request.
  Otherwise `fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, { method: "POST", headers:
  JSON, body: JSON.stringify({ chat_id, text }), signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
  cache: "no-store" })`. No `parse_mode` (FR-6).
  - `response.ok` and body `ok === true` → `{ ok: true }`.
  - Anything else with a response → `{ ok: false, reason: "http", status: response.status }`
    (Telegram mirrors `error_code` in the HTTP status; a 200 with `ok: false` reports 200).
    A body that isn't JSON counts the same.
  - A thrown `DOMException` named `TimeoutError` → `timeout`; any other thrown error → `network`.
  - The URL holds the token, so the client never logs, throws, or returns the URL, the error
    object, or the response body (NFR-1). It logs nothing at all; the caller logs.
- Telegram's text limit is 4096 characters; the longest valid message (D3 limits + the fixed
  lines) is under 800, so no truncation is needed.

### D3 — One schema (FR-5, FR-10, NFR-3)

```ts
export const contactMessageSchema = z.object({
  name: z.string().trim().min(1, CONTACT_FIELD_ERRORS.nameRequired).max(NAME_MAX_LENGTH, CONTACT_FIELD_ERRORS.nameTooLong),
  email: z.string().trim().max(EMAIL_MAX_LENGTH, CONTACT_FIELD_ERRORS.emailTooLong)
    .pipe(z.email({ error: CONTACT_FIELD_ERRORS.emailInvalid })),
  message: z.string().trim().max(MESSAGE_MAX_LENGTH, CONTACT_FIELD_ERRORS.messageTooLong), // optional: empty passes
  [HONEYPOT_FIELD]: z.string().optional(),
});
```

- Lengths count UTF-16 code units (Zod's `.length`), after trimming.
- The too-long messages in `contact-messages.ts` interpolate the limits
  (`` `Имя должно быть не длиннее ${NAME_MAX_LENGTH} символов` ``), so each number is written
  once, in `contact.constants.ts` (NFR-6).
- An empty email fails `z.email()` and shows «Введите корректный адрес электронной почты»; a
  too-long one fails `max` first and shows the length message.
- The honeypot is part of the schema so the action's `parsedInput` carries it; the schema never
  rejects on it (FR-10 answers success instead).

### D4 — Server Action (FR-6, FR-9, FR-10, FR-11, NFR-2)

```ts
export const sendContactMessageAction = contactActionClient
  .inputSchema(contactMessageSchema)
  .action(async ({ parsedInput }): Promise<ContactSendResult> => {
    if (parsedInput[HONEYPOT_FIELD]) return { status: "sent" };
    const result = await sendTelegramMessage(formatContactMessage(parsedInput, siteConfig.name));
    if (!result.ok) {
      console.error("[contact] send failed", result.status === undefined ? { reason: result.reason } : { reason: result.reason, status: result.status });
      return { status: "failed" };
    }
    return { status: "sent" };
  });
```

- `ContactSendResult = { status: "sent" } | { status: "failed" }`: success is explicit, never
  "no error" (`docs/code-style.md`).
- No session read (FR-11). No `revalidate`/`refresh`: nothing on the page changes.
- An unexpected throw goes to `createActionClient`'s `handleServerError` (logs `error.name`
  only, returns the generic message), which the form maps to the failure alert.
- `formatContactMessage({ name, email, message }, siteName)` returns
  `Новое сообщение с сайта ${siteName}\nИмя: ${name}\nПочта: ${email}`, followed by
  `\n\n${message}` only when the trimmed message is non-empty, with the already-trimmed values.

### D5 — Form (FR-3, FR-5, FR-7, FR-8, FR-9)

```ts
type ContactFormState =
  | { readonly status: "idle"; readonly values: ContactFormValues }
  | { readonly status: "invalid"; readonly values: ContactFormValues; readonly fieldErrors: ContactFieldErrors }
  | { readonly status: "failed"; readonly values: ContactFormValues }
  | { readonly status: "sent" };
```

- `ContactForm` (`"use client"`) uses `useActionState(submitContact, INITIAL_STATE)`.
  `submitContact(previous, formData)` (`ContactForm/submit-contact.ts`):
  1. `readContactValues(formData)` → raw strings (name, email, message, website);
  2. `contactMessageSchema.safeParse(values)`; failure → `invalid` with the first error per
     field and the raw values, **no action call** (FR-5);
  3. otherwise `await sendContactMessageAction(values)` and `toContactFormState(result, values)`:
     `validationErrors` → `invalid`; `serverError` or no `data` → `failed`; `data.status` →
     `sent` / `failed`.
  4. The call is wrapped in `try`/`catch`: a **rejected** call (the POST never got a result:
     the visitor's network dropped, the hosting firewall answered 429, the body limit was hit)
     becomes `{ status: "failed", values }`, and the browser console gets only the error's
     `name` (NFR-2). Without it, `useActionState` rethrows during render; `ContactForm` sits in
     the root layout, outside `app/error.tsx`, so Next's global error screen would replace the
     page and lose the typed text (FR-9). Same principle as ADR 0005 point 4 and
     `authors/hooks/settle-profile-action.ts`.
- `noValidate` on the form: the schema is the only validation, so its messages are what the
  visitor sees (as in `SignInForm`).
- Inputs are uncontrolled with `defaultValue` from `state.values`, so React's reset after the
  action keeps them (FR-4, FR-9). «Имя» and «Электронная почта» use `TextField`
  (`type="text"`, `type="email"`, `autoComplete="name"` / `"email"`); «Ваше сообщение» is a
  `<textarea rows={5}>` with `FIELD_INPUT_CLASS` and the same label/error wiring
  (`useId`, `aria-invalid`, `aria-describedby`), like the author editor's textarea.
- Focus to the first invalid field (FR-5): an effect keyed on the state object focuses the
  first field with an error, in field order, when `status === "invalid"`.
- Pending (FR-7): the fields and the button sit in one `<fieldset disabled={pending}>` (no
  border or padding of its own), so the `pending` flag from `useActionState` disables all of
  them at once; the button's label switches to «Отправка…». While `pending`, the form renders
  no field errors and no failure alert even though `state` still holds the previous result
  (`useActionState` keeps it until the action returns), so old errors vanish at submit time
  (FR-5, FR-9; user decision 2026-10-23). The values were already read from
  the `FormData` at submit, so disabling the inputs drops nothing from the request.
- Failure (FR-9): a danger `Alert` above the fields when `status === "failed"`. The same
  state-keyed effect that handles FR-5's focus moves focus to the «Отправить» button (a ref)
  when `status === "failed"`, since the disabled fieldset dropped it during sending (user
  decision 2026-10-23).
- Success (FR-8): `status === "sent"` renders, instead of the form, a success `Alert`
  (`role="status"`) «Спасибо! Ваше сообщение отправлено.» and a `primary` «Закрыть» `Button`
  (the title stays, the intro line is hidden, as in mockup state 2e) that calls the
  `onClose` prop. The form tells the dialog once via an `onSent` prop (effect on
  `status === "sent"`).
- Honeypot (FR-10): a wrapper `div` with `aria-hidden="true"` and the `sr-only` utility around
  an `<input name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off">`. `sr-only` keeps it in the DOM
  and fillable by bots but invisible and unreachable for people; `aria-hidden` and
  `tabIndex={-1}` keep it out of assistive tech and the tab order.

### D6 — Dialog (FR-1, FR-2, FR-4)

- `ContactDialog` (`"use client"`) renders the trigger `<button type="button" aria-haspopup="dialog">`
  and a native `<dialog aria-labelledby={titleId}>`. Native `showModal()` gives the modal
  behaviour for free: the rest of the page becomes inert, focus stays inside, Escape closes it,
  and on close the browser returns focus to the element that had it (the trigger).
- Open: `dialogRef.current?.showModal()`. Initial focus: `autoFocus` on the «Имя» input
  (dialog focusing steps honour it); while the success view is shown, its «Закрыть» button
  has `autoFocus` instead.
- Close: the corner «Закрыть» button (`aria-label`, visible `×`) and the success «Закрыть» call
  `dialogRef.current?.close()`; Escape is native; backdrop: an `onClick` on the `<dialog>` that
  closes when `event.target === event.currentTarget`. The dialog's padding lives on an inner
  wrapper, so every click inside the box lands on a descendant, never on the `<dialog>`
  itself.
- Keeping values (FR-4): the `<dialog>` and form stay mounted while closed, so the DOM keeps
  typed values and the form state keeps errors.
- Fresh form after success (FR-8): `ContactDialog` keeps `formKey` and a `sent` flag. `onSent`
  sets `sent`; the dialog's `close` event, when `sent` is set, increments `formKey` (remounting
  `ContactForm` with an empty initial state) and clears `sent`.
- Animation (FR-2), in `ContactDialog.module.css` (custom effect, so a CSS Module per
  `docs/styling.md`):

  ```css
  .dialog {
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 200ms ease-out, transform 200ms ease-out,
      overlay 200ms ease-out allow-discrete, display 200ms ease-out allow-discrete;
  }
  .dialog[open] { opacity: 1; transform: none; }
  @starting-style { .dialog[open] { opacity: 0; transform: translateY(8px); } }
  .dialog::backdrop { background: var(--backdrop); opacity: 0; transition: /* same, for opacity/overlay/display */; }
  .dialog[open]::backdrop { opacity: 1; }
  @starting-style { .dialog[open]::backdrop { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .dialog, .dialog::backdrop { transition: none; } }
  ```

  The backdrop colour is the new `--backdrop` token (FR-13), defined in `src/app/globals.css`
  next to the other tokens, from existing ones, with no new literal (NFR-4):

  ```css
  :root { --backdrop: color-mix(in srgb, var(--foreground) 40%, transparent); }
  @media (prefers-color-scheme: dark) {
    :root { --backdrop: color-mix(in srgb, var(--background) 70%, transparent); }
  }
  ```

  A single mix of `foreground` would be light grey in the dark scheme and lighten the page
  behind it; mixing towards the near-black `background` there only ever darkens. It is not
  added to `@theme` (no Tailwind utility needs it). `docs/design-system.md` lists it after the
  next `design-system` run, which reads the code. Box layout
  (`bg-background text-foreground border border-border`, width, padding, radius) is Tailwind
  utilities on the dialog and its inner wrapper, with the approved mockup's values (`ui-plan.md`):
  `w-full max-w-lg` (32rem), `rounded-2xl` (16 px), `p-5` below 600 px and `p-6` from 600 px,
  `gap-4` between header, form, and button, and a 16 px gutter to the viewport edge at 375 px.
- The trigger looks exactly like the footer links (FR-1, user request 2026-10-23): it takes a
  `triggerClassName` prop, which the root layout fills with `site-footer`'s exported
  `FOOTER_LINK_CLASS` (D7), the same class the links use. `ContactDialog` adds only a reset for
  button defaults (`cursor-pointer`; Tailwind's preflight already clears the background,
  border, and padding), so there is one source for the look.

### D7 — Footer slot (FR-1, FR-12, NFR-5)

- `SiteFooter({ contactControl }: SiteFooterProps)` with `SiteFooterProps = { readonly contactControl: ReactNode }`
  in `SiteFooter.types.ts`. The body keeps `"use cache"` and `cacheLife("days")` and renders
  `<li>{contactControl}</li>` after the mapped links; it never reads the slot, so it stays out
  of the cache key ("Interleaving").
- `FOOTER_LINK_PATHS` and `FOOTER_LINK_ORDER` drop `contact`; `FOOTER_LINK_LABELS` drops
  `contact`. The label «Связаться с нами» moves to `contact-messages.ts` (copy belongs to the
  feature that shows it).
- The links' class string moves out of `SiteFooter.tsx` into `FOOTER_LINK_CLASS` in
  `model/site-footer.constants.ts`, used by the links and exported from `site-footer`'s
  `index.ts`.
- `app/layout.tsx`:
  `<SiteFooter contactControl={<ContactDialog triggerClassName={FOOTER_LINK_CLASS} />} />`.
  Composition happens in `app/`, so neither feature imports the other (architecture boundary
  rules), and the look has one source (D6).
- `/contact` is not planned (FR-12, user decision 2026-10-23). Every placeholder for it goes:
  `FOOTER_LINK_PATHS.contact`, the constants' doc comment about it, `SiteFooter`'s doc comment
  ("about/privacy/contact links"), the footer test's `["Связаться с нами", "/contact"]` row,
  and in `tests/web-qa-scenarios/`: `about-footer-links.spec.ts` loses its contact part
  (`CONTACT_PATH`, `CONTACT_LABEL`, `NOT_FOUND_HEADING`, `HTTP_NOT_FOUND`, the click and the 404
  check, `/contact` in its `pages:` header and title), and `site-footer-on-every-page.spec.ts`
  checks two links and then the «Связаться с нами» button instead of a third link. No route or
  breadcrumbs slot page is added.

### D8 — Environment and docs (NFR-1, NFR-7)

- `.env.example` gains `TELEGRAM_BOT_TOKEN=` and `TELEGRAM_CHAT_ID=` (names only).
- `docs/environment.md` gains a Telegram section: server-only, never `NEXT_PUBLIC_`; how to get
  the token (BotFather) and the chat id; what happens when unset (every submit shows the
  failure alert, log reason `config`); the hosting-level per-IP rule for Server Action POSTs as
  a deploy step; rotation (revoke in BotFather, update the env).
- `docs/architecture.md`: `features/contact/`, `shared/lib/telegram/`, the footer's
  `contactControl` slot, and the layout line.

### D9 — Testing

- `shared/lib/telegram/tests/client.test.ts` (mocked `fetch`, env set per test): missing or
  malformed token or chat id → `config`, no request; the request goes to
  `…/bot<token>/sendMessage` as POST with `{ chat_id, text }` and no `parse_mode`, with a
  signal; 200 `{ ok: true }` → ok; 500 → `http` 500; 200 `{ ok: false }` → `http` 200;
  non-JSON → `http`; `TimeoutError` → `timeout`; `TypeError` → `network`; no result holds the
  token.
- `features/contact/tests/model/contact.schema.test.ts`: trimming; boundaries 80/81,
  254/255, 300/301; empty and whitespace-only values (an empty message passes); each message string.
- `tests/model/format-contact-message.test.ts`: FR-6's exact text.
- `tests/model/form-state.test.ts`: every `toContactFormState` branch.
- `tests/actions/contact.actions.test.ts` (mocked `sendTelegramMessage`, spied `console.error`):
  valid → `sent`, one call with the formatted text; honeypot → `sent`, no call, no log;
  each failure reason → `failed`, one log line with reason (+ status for `http`) and no
  submitted value; invalid input → validation errors, no call; an unexpected throw → generic
  server error, no submitted value in any log.
- `tests/components/ContactForm.test.tsx` (mocked action): client-side errors with no action
  call and focus on the first invalid field; pending label and disabled button; success view;
  failure alert with values kept; a **rejected** action call shows the same failure alert with
  values kept, renders no error boundary, and logs only the error's name.
- `tests/components/ContactDialog.test.tsx`: opens on the trigger, closes on «Закрыть» and on a
  backdrop click (target is the dialog) but not on a click inside; values kept across
  close/open; a fresh form after success. jsdom's `HTMLDialogElement` may lack `showModal` and
  `close`; the test stubs them on the prototype when missing (toggling `open` and dispatching
  `close`).
- `site-footer` `SiteFooter.test.tsx`: two links in order, both with `FOOTER_LINK_CLASS`, then
  the slot content inside the nav; no `href="/contact"`.
- `ContactDialog.test.tsx`: the trigger carries the `triggerClassName` it was given.
- The two recorded browser scenarios are updated per D7 and replayed in Gate 3.
- Gate 3 covers what jsdom can't: the animation and reduced motion, the focus trap and focus
  return, the backdrop, and a real delivery to the configured chat.

### Sequence diagrams

Open, submit, deliver:

```mermaid
sequenceDiagram
    participant V as Visitor (browser)
    participant D as contact/ContactDialog (client)
    participant F as contact/ContactForm (client)
    participant S as contact/model/contact.schema
    participant A as contact/actions/sendContactMessageAction (server)
    participant T as shared/lib/telegram (server-only)
    participant TG as Telegram Bot API

    V->>D: click «Связаться с нами» (footer slot)
    D->>D: dialog.showModal() → fade + rise 200 ms (none under reduced motion)
    V->>F: fill fields, click «Отправить»
    F->>S: safeParse(values)
    alt invalid
        S-->>F: field errors
        F-->>V: errors under fields, focus first invalid (no request)
    else valid
        F->>F: pending: «Отправка…», button disabled
        F->>A: POST Server Action (values + honeypot)
        alt call rejected (network down / hosting 429 / body limit)
            A--xF: promise rejects, no result
            F->>F: catch → { status: "failed", values }; console gets error.name only
            F-->>V: danger alert, values kept (page stays)
        end
        A->>S: inputSchema parse (untrusted input)
        alt invalid on the server
            A-->>F: validationErrors
            F-->>V: errors under fields
        else honeypot filled
            A-->>F: { status: "sent" } (nothing sent, nothing logged)
            F-->>V: «Спасибо! Ваше сообщение отправлено.»
        else unexpected throw in the action
            A->>A: handleServerError: log error.name only
            A-->>F: serverError (generic message)
            F-->>V: danger alert, values kept
        else valid
            A->>T: sendTelegramMessage(formatted text)
            T->>T: readTelegramConfig()
            alt config missing or malformed
                T-->>A: { ok: false, reason: "config" }
            else
                T->>TG: POST /bot<token>/sendMessage { chat_id, text } (10 s timeout)
                alt ok
                    TG-->>T: 200 { ok: true }
                    T-->>A: { ok: true }
                else HTTP error / ok:false / non-JSON
                    TG-->>T: status
                    T-->>A: { ok: false, reason: "http", status }
                else no answer in 10 s / network error
                    T-->>A: { ok: false, reason: "timeout" | "network" }
                end
            end
            alt ok
                A-->>F: { status: "sent" }
                F-->>V: success view; on close the form remounts empty
            else failure
                A->>A: console.error("[contact] send failed", { reason, status? })
                A-->>F: { status: "failed" }
                F-->>V: danger alert, values kept
            end
        end
    end
```

The "unexpected throw" branch stands for a throw anywhere in the action after parsing,
including inside `sendTelegramMessage` (which returns failures as values and should not throw).

## Risks / Trade-offs

- **R1 — No app-level rate limit.** The Server Action is a public endpoint; a script can
  bypass the honeypot and flood the owner's chat. Mitigation: the honeypot stops naive bots;
  the hosting-level per-IP rule (ADR 0007 point 5) is a deploy step; Telegram's own per-chat
  limits return 429, which shows the failure alert. If abuse appears, a follow-up change can
  add a Postgres counter keyed by a hashed IP, ADR 0007 style.
- **R2 — A third party processes personal data.** Name, email, and message go to Telegram's
  servers. The privacy policy (Contentful, editorial) should say so before deploy; listed in
  the Migration Plan.
- **R3 — Browser support for the exit animation.** `@starting-style` and `transition-behavior:
  allow-discrete` work in current Chrome, Edge, and Safari; Firefox animates the opening but may
  close without the exit transition (no `overlay` transition). Accepted: the dialog still
  closes correctly.
- **R4 — Lost messages on failure.** Nothing is stored, so a failed delivery is only visible to
  the visitor (alert) and the server log. Accepted for a contact form; the visitor keeps their
  text and can retry.
- **R5 — A button among links.** The trigger is a `<button>` styled with `FOOTER_LINK_CLASS`,
  so it looks like a link but announces as a button (correct, since it opens a dialog rather
  than navigating). A `site-footer` change to `FOOTER_LINK_CLASS` restyles it too, which is the
  intent. Browser defaults the class doesn't cover (font inheritance, cursor) are reset in
  `ContactDialog` and checked side by side in Gate 3.
- **R6 — The dialog lives inside the footer's `nav` in the DOM.** In modal mode it renders in
  the top layer and the rest of the page is inert, so position and reading order are correct;
  Gate 3 checks it with a screen-reader snapshot.
- **R7 — An action left pending while the dialog is closed** still completes; the visitor sees
  the result on reopening (a success shows the thank-you view, FR-8; the `formKey` bump waits
  for the `close` event that follows it, D6). Accepted (user decision 2026-10-23).
- **R8 — The honeypot can trip a browser extension that fills every field.** Such a visitor
  sees the thank-you message and the owner gets nothing. Accepted as rare; `autocomplete="off"`
  and an unlabelled name reduce it.

## Migration Plan

1. Create the bot and get the chat id (`docs/environment.md`, D8); set `TELEGRAM_BOT_TOKEN` and
   `TELEGRAM_CHAT_ID` in `.env.local` and, at deploy, on the hosting platform.
2. At deploy: a per-IP rate rule covering Server Action POSTs (existing deploy checklist item),
   and a privacy-policy mention of Telegram (R2).
3. Without the variables the app builds and runs; every submit shows the failure alert and logs
   reason `config`.
4. Rollback: revert the change (the footer returns to its previous three links). Revoke the bot
   token in BotFather if it is no longer needed.

## Scaffold map

Written after the files existed (scaffold, 2026-10-23). Stubs throw `not implemented`; components
return `null`. `SiteFooter.tsx`, the footer constants, `app/layout.tsx`, `globals.css`, the dialog's
CSS Module, the recorded browser scenarios, docs, and `.env.example` are left to their tasks.

| File | Responsibility | Exports |
| --- | --- | --- |
| `src/shared/lib/telegram/telegram.constants.ts` | env var names, API base, timeout, token and chat-id patterns | `TELEGRAM_ENV`, `TELEGRAM_API_BASE`, `TELEGRAM_REQUEST_TIMEOUT_MS`, `TELEGRAM_TOKEN_PATTERN`, `TELEGRAM_CHAT_ID_PATTERN` |
| `src/shared/lib/telegram/telegram.types.ts` | config and send result types | `TelegramConfig`, `TelegramConfigResult`, `TelegramFailureReason`, `TelegramSendResult` |
| `src/shared/lib/telegram/config.ts` | reads the token and chat id (stub) | `readTelegramConfig` |
| `src/shared/lib/telegram/client.ts` | sends one message (stub) | `sendTelegramMessage` |
| `src/shared/lib/telegram/index.ts` | server-only public entry | `sendTelegramMessage`, `TelegramFailureReason`, `TelegramSendResult` |
| `src/features/contact/model/contact.constants.ts` | length limits, honeypot field name | `NAME_MAX_LENGTH`, `EMAIL_MAX_LENGTH`, `MESSAGE_MAX_LENGTH`, `HONEYPOT_FIELD` |
| `src/features/contact/model/contact-messages.ts` | UI copy, limit messages interpolate the constants | `CONTACT_FIELD_ERRORS`, `CONTACT_COPY` |
| `src/features/contact/model/contact.schema.ts` | field shape only; task 2.1 adds trimming and limits | `contactMessageSchema`, `ContactMessageInput` |
| `src/features/contact/model/contact.types.ts` | action result, form values and state, the action-result shape the form reads | `ContactSendResult`, `ContactFormValues`, `ContactField`, `ContactFieldErrors`, `ContactFormState`, `ContactActionResult` |
| `src/features/contact/model/format-contact-message.ts` | Telegram text (stub) | `formatContactMessage` |
| `src/features/contact/model/form-state.ts` | read the form, map the action result (stubs) | `readContactValues`, `toContactFormState` |
| `src/features/contact/actions/action-client.ts` | the shared log-and-mask action client | `contactActionClient` |
| `src/features/contact/actions/contact.actions.ts` | the Server Action, schema wired, body stub | `sendContactMessageAction` |
| `src/features/contact/components/ContactForm/ContactForm.tsx` (+ `.types.ts`) | the form (returns `null`) | `ContactForm`, `ContactFormProps` |
| `src/features/contact/components/ContactForm/submit-contact.ts` | browser check, action call, rejection handling (stub) | `submitContact` |
| `src/features/contact/components/ContactDialog/ContactDialog.tsx` (+ `.types.ts`) | trigger and dialog (returns `null`) | `ContactDialog`, `ContactDialogProps` |
| `src/features/contact/index.ts` | public API | `ContactDialog` |
| `src/features/site-footer/components/SiteFooter/SiteFooter.types.ts` | the footer's slot prop | `SiteFooterProps` |
| `knip.jsonc` | temporary `ignoreFiles` for the unwired stubs; telegram removed in task 2.2, the rest in task 3.3 | — |

`ContactActionResult` lives in `model/contact.types.ts`, mirroring `AuthActionResult`, so `model/`
names no next-safe-action type (Gate 1 PLAUSIBLE note).
