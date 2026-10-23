# Tasks

## 1. Telegram client in `shared/lib/telegram` <!-- judgement-heavy -->

- [x] 1.1 (FR-6, FR-9, NFR-1, NFR-6) Add `src/shared/lib/telegram/` per design D1 and D2:
  `telegram.constants.ts` (env var names, API base URL, `TELEGRAM_REQUEST_TIMEOUT_MS`, token and
  chat-id patterns), `telegram.types.ts`, `config.ts` (`readTelegramConfig`), `client.ts`
  (`sendTelegramMessage`), and `index.ts`; every module starts with `import "server-only"`.
  - Verify with `src/shared/lib/telegram/tests/client.test.ts` (mocked `fetch`, env set per
    test): every case in design D9's first bullet, including that no result and no thrown error
    holds the token.
- [x] 1.2 (NFR-1, NFR-7) Add `TELEGRAM_BOT_TOKEN=` and `TELEGRAM_CHAT_ID=` (names only) to
  `.env.example`, and the Telegram section to `docs/environment.md` per design D8 (BotFather
  token, getting the chat id, server-only, behaviour when unset, per-IP hosting rule as a
  deploy step, rotation).
  - Verify: `npm run typecheck && npm run lint && npm run knip` pass.

## 2. Contact model and Server Action <!-- judgement-heavy -->

- [x] 2.1 (FR-5, FR-10, NFR-3, NFR-6) Add `src/features/contact/model/`: `contact.constants.ts`,
  `contact-messages.ts` (every string of the proposal's UI copy table, plus the footer button
  label), `contact.schema.ts` (design D3), `contact.types.ts`, `format-contact-message.ts`
  (FR-6), and `form-state.ts` (`readContactValues`, `toContactFormState`, design D5).
  - Verify with `tests/model/contact.schema.test.ts` (trimming; boundaries 80/81, 254/255,
    300/301; empty and whitespace-only values, an empty message passing; each message, whose limit numbers come from
    the length constants, NFR-6), `tests/model/format-contact-message.test.ts`
    (FR-6's exact text, with and without a message), and `tests/model/form-state.test.ts` (every branch).
- [x] 2.2 (FR-6, FR-9, FR-10, FR-11, NFR-2) Add `actions/action-client.ts`
  (`contactActionClient`, `logPrefix: "contact"`) and `actions/contact.actions.ts`
  (`sendContactMessageAction`, design D4).
  - Verify with `tests/actions/contact.actions.test.ts` (mocked `sendTelegramMessage`, spied
    `console.error`): valid → `sent` with one call holding the formatted text; honeypot →
    `sent`, no call, no log; each failure reason → `failed` with exactly one
    `[contact] send failed` line holding the reason (and status for `http`) and no submitted
    value; invalid input → validation errors, no call; an unexpected throw → generic server
    error, no submitted value in any log line; FR-11: a valid call succeeds with no auth or
    Supabase module mocked or set up, and `contact.actions.ts` imports nothing from
    `@/features/auth` or `@/shared/lib/supabase`.
  - Remove the `src/shared/lib/telegram/**` entry from `knip.jsonc`'s `ignoreFiles` (scaffold);
    `npm run knip` passes without it. Triage any unused-export finding it surfaces (remove the
    export or use it) instead of adding an ignore back.

## 3. Contact dialog, form, and footer slot <!-- judgement-heavy -->

- [x] 3.1 (FR-3, FR-5, FR-7, FR-8, FR-9, FR-10, NFR-4) Add `components/ContactForm/`
  (`ContactForm.tsx`, `ContactForm.types.ts`, `submit-contact.ts`) per design D5, styled from
  the approved mockup with token utilities only.
  - Verify with `tests/components/ContactForm.test.tsx` (mocked action): FR-5's invalid case
    shows the name and email errors and none under «Ваше сообщение», calls no action, and focuses «Имя»; the length-limit errors; the
    pending label and disabled button with one action call (FR-7); the success view (FR-8);
    the failure alert with values kept and focus on «Отправить», gone after the next submit
    (FR-9); the fields are disabled while pending (FR-7); while pending, earlier field errors
    and the failure alert are not rendered (FR-5, FR-9); a rejected action
    call (mock rejects) shows the same alert with values kept and no error boundary, and
    `console.error` gets only the error's name (FR-9, NFR-2, design D5 step 4); the honeypot input
    (`name` = `HONEYPOT_FIELD`) has `tabIndex=-1` and `autoComplete="off"` and sits inside a
    wrapper with `aria-hidden="true"` and `sr-only` (FR-10, design D5).
- [x] 3.2 (FR-1, FR-2, FR-4, FR-8, FR-13, NFR-4) Add the `--backdrop` token to `src/app/globals.css`
  for both colour schemes (design D6) and `components/ContactDialog/` (`ContactDialog.tsx`,
  `ContactDialog.module.css`, and the scaffolded `ContactDialog.types.ts`; the PR #124 review moved
  the dialog box and its stylesheet to `src/shared/ui/Dialog/`) per design D6, and export `ContactDialog` from
  `src/features/contact/index.ts`.
  - Verify with `tests/components/ContactDialog.test.tsx` (stubs `showModal`/`close` on
    `HTMLDialogElement.prototype` when jsdom lacks them): the trigger has `aria-haspopup="dialog"`
    and the `triggerClassName` it was given, and opens the dialog; «Закрыть» and a backdrop click (target is the dialog) close it, and a
    click inside the box doesn't; typed values and the last submit's field errors survive
    close/open (FR-4); after success, close/open shows an empty form; a success that resolves
    while the dialog is closed shows the thank-you view on the next open and an empty form on
    the open after that (FR-8, design R7).
- [x] 3.3 (FR-1, FR-12, NFR-5) Footer contact button per design D7: `SiteFooter` renders
  `<ContactDialog triggerClassName={FOOTER_LINK_CLASS} />` in a last `<li>`, keeping `"use cache"`;
  move the links' class string into `FOOTER_LINK_CLASS`; `src/app/layout.tsx` keeps
  `<SiteFooter />`. (Revised in the PR #124 review: first done as a `contactControl` slot.) Remove every `/contact`
  placeholder (design D7, FR-12): `contact` in `FOOTER_LINK_PATHS`, `FOOTER_LINK_ORDER`, and
  `FOOTER_LINK_LABELS`; the constants' and `SiteFooter`'s doc comments; the footer test's
  `/contact` row; the contact part of `tests/web-qa-scenarios/about-footer-links.spec.ts`
  (constants, click, 404 check, `pages:` header, title); and the third link of
  `tests/web-qa-scenarios/site-footer-on-every-page.spec.ts`, which checks the «Связаться с
  нами» button after the two links instead.
  - Verify with `SiteFooter.test.tsx`: exactly two links in order with `FOOTER_LINK_CLASS`,
    then the contact button with the same class inside the nav; no `href="/contact"`. `grep -rn "/contact" src
    tests/web-qa-scenarios` prints nothing.
  - Remove the remaining add-contact-form `ignoreFiles` entries from `knip.jsonc`
    (`src/features/contact/**`, `SiteFooter.types.ts`) and the `ignoreFiles` key with its
    comment; `npm run knip` passes. Triage any unused-export finding instead of re-adding an
    ignore.

## 4. Documentation and verification <!-- judgement-heavy -->

- [ ] 4.1 (NFR-7) Update the Purpose line of `openspec/specs/site-footer/spec.md` (a delta
  can't change it) to "…and the links to the about and privacy pages, plus the button that
  opens the contact dialog". Update `docs/architecture.md` per design D8 (`features/contact/`,
  `shared/lib/telegram/`, `site-footer`'s import of `ContactDialog`), and its `site-footer/` line
  ("about/privacy/contact links" → about and privacy links plus the contact button).
- [ ] 4.2 (NFR-1, NFR-3, NFR-4, NFR-5, NFR-6) Verify statically and run the chain.
  - `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are read only under `src/shared/lib/telegram/`
    (excluding tests); every module there starts with `import "server-only"`; no
    `NEXT_PUBLIC_TELEGRAM` anywhere (NFR-1).
  - `z.object(` appears once in `src/features/contact/` outside tests, in
    `model/contact.schema.ts`, and both `submit-contact.ts` and `contact.actions.ts` import it
    (NFR-3).
  - The NFR-4 colour search over `src/features/contact` (excluding `tests/`) prints nothing.
  - `src/features/site-footer/` has no `"use client"` and `SiteFooter` still opens with
    `"use cache"`; the `npm run build` route table marks the same routes `ƒ` as `main` did
    before the change (NFR-5).
  - The NFR-6 literal search over `src/features/contact` and `src/shared/lib/telegram`
    (excluding tests) finds each value only in a constant's definition.
  - `npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run knip`
    all pass.
  - With a dummy `TELEGRAM_BOT_TOKEN` set for the build, a search of `.next/static` for that
    value finds nothing (NFR-1).
- [ ] 4.3 (FR-1, FR-2, FR-13, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, NFR-1)
  Gate 3 (`web-qa`), with a real bot configured in `.env.local`, in both colour schemes at
  375 px and 1280 px against the approved mockup:
  - FR-1/FR-3: the footer order, the dialog opens from click and from keyboard, focus on «Имя»,
    Tab stays inside, contents in order;
  - FR-2: computed transitions (200 ms opacity/transform) and 0 s under emulated reduced motion;
  - FR-13: in the dark scheme the backdrop's computed colour is `background` at 70% and the
    page behind it looks darker, never lighter (screenshots with the dialog open and closed);
    in the light scheme it is `foreground` at 40%;
  - FR-4: Escape, «Закрыть», and a backdrop click close it, focus returns to the trigger, typed
    values survive;
  - FR-5: FR-5's invalid case shows the errors with no network request to the action;
  - FR-6/FR-8/FR-11: signed out, a valid submit shows the thank-you message, and the user
    confirms the message arrived in the Telegram chat in the expected format; reopening shows
    an empty form;
  - FR-7: the sending label while the request is in flight;
  - FR-9: with `TELEGRAM_BOT_TOKEN` unset in the dev server's env, a submit shows the failure
    alert with values kept, and the server log has one `[contact] send failed` line with
    reason `config` only;
  - FR-10: filling `website` through devtools and submitting shows the thank-you message and
    sends nothing;
  - FR-1: the «Связаться с нами» button looks identical to the two links at rest, on hover,
    and on focus (side-by-side screenshot), in both colour schemes;
  - FR-12: the page HTML of `/` has no `href="/contact"`, and the updated recorded scenarios
    (`about-footer-links`, `site-footer-on-every-page`) pass;
  - NFR-1: the browser's network list holds no request to `api.telegram.org`;
  - no console errors; replay the recorded scenarios.
