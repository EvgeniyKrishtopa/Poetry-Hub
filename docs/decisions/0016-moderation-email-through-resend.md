# 0016. Moderation emails go out through Resend over HTTP; the key is a server-only secret, not a database key

## Status

Accepted (2026-11-18)

Amends 0015 (the admin-moderation non-goal of sending notifications) and notes 0005 (Decision 1).

## Context

`admin-violations-feedback` lets the admin warn an author before a block and sends a standard email after a
block, a ban and an admin delete. The address of an account lives in `auth.users`, which the app reads only
through guarded SQL functions (ADR 0015), so the app never holds it except in the answer of one of those
functions. Sending needs an outside service and a secret for it. ADR 0015 forbids a service-role key in
`src/`; it says nothing about a key for a service that is not the database. The admin-moderation change listed
notifications as a non-goal, so this decision is the one that lifts it. Details live in the change's
`design.md` (D1, D4, D5).

## Decision

1. **Resend, called with `fetch` from one server-only module.** `src/shared/lib/email/` mirrors
   `shared/lib/telegram`: `sendEmail({ to, subject, text, idempotencyKey })` returns `{ ok: true }` or a failure
   reason (`config`, `timeout`, `network`, `conflict`, `http`). Every file starts with `import "server-only"`.
   No SDK: one POST does not justify a dependency.
2. **`RESEND_API_KEY` and `EMAIL_FROM` are server-only secrets for one outside service.** Never prefixed
   `NEXT_PUBLIC_`, read only inside the module, lazily. A scan test fails on `NEXT_PUBLIC_RESEND` and on any
   non-server file reading them. The key is not a database key: ADR 0015 Decision 1 (no service-role key, ever)
   still holds, and a leaked Resend key can send mail but reads no row.
3. **The case id is the idempotency key of a warning.** A case is warned once, so its id is stable across
   retries, modal reopenings and tabs. Resend keeps a key for 24 hours, so the key stops a quick retry from
   sending twice, not a retry a day later. The case is marked warned only after Resend accepted the email (a
   `conflict` counts as accepted: a failed request is not stored, so an earlier one was accepted); a lost mark
   leaves the case `waiting` and the retry reuses the key.
4. **The standard notice is best effort and never decisive.** It runs after the action committed, retries once
   on `timeout`, `network` and HTTP 5xx with the same key, and its outcome (`sent`, `failed`, `skipped`) only
   adds a notice for the admin. A failed email never rolls back a block, ban or delete.
5. **No message text and no address is stored or logged.** The warning's text goes from the form to Resend and
   is not kept; the audit log records the kind of event, never an address or a body; failure logs name the
   failure kind only.

## Consequences

**Positive**

- No new dependency, and the secret has a small blast radius (one module, one scan test).
- A double click, a retry or a second tab cannot send a warning twice within a day.
- Moderation never fails because mail is down.

**Negative**

- A new outside dependency and a manual step before deploy: a Resend account, a verified sender domain, the
  two variables on the host.
- Retrying a warning more than 24 hours after an accepted send whose mark was lost can send a second email.
- Because the text is not stored, the admin cannot re-read what was sent.

## Alternatives Considered

- The Resend SDK -- rejected: one POST with a bearer key, no benefit over `fetch`.
- Supabase Auth's SMTP for these emails -- rejected: it sends only Auth templates (confirm, reset) and cannot
  carry an admin's text.
- Storing the message to resend it later -- rejected: personal text the audit log must not hold, and the case
  id already protects a quick retry.
- Making the notice part of the action's transaction -- rejected: a mail outage would then block a block or a
  ban the admin needs at once.
