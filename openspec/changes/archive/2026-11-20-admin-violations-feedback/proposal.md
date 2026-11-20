## Why

An admin can already block, ban and delete, but the user on the other end learns nothing: the account just stops working or a poem disappears. There is also no place to keep a user whose content is under review, and no way to warn them before acting. The site needs a feedback loop from the admin to the user: a review list of possible violators, a warning email with a one-day period to react, and a standard email after every restricting action.

## What Changes

- A **violation review list** (the "offenders list") on a new admin page `/admin/violations`. A user is on it through an open **violation case**: the user, a **ground**, and where the case stands. One open case per user.
- **Two grounds**, fixed for now (a future commenting feature will add more):
  - `harmful-content`: text that calls for violence or cruelty, degrades a person, justifies taking away someone's freedom, or justifies coercion. Warning first, then one day to react, then the admin decides.
  - `malicious-activity`: attempts at XSS, DoS, or other compromising behaviour. No warning: the admin may block at once.
- **Adding to the list**: an admin-only button on the public author page, the poem page and the collection page (never on the admin's own content), and a **drag and drop** of a user row from the `/admin` list onto a new link at the top of `/admin` that leads to the list page. Each row also gets a plain button, so the drop is a shortcut, not the only way.
- **`/admin` changes**: the exact-email filter is removed (**BREAKING** for `admin-moderation` FR-3's filter), and a link «Список нарушителей» is added at the top.
- **The list page**: each case shows the user's email, author name, ground, and a **status** derived from the case: waiting for a decision with no warning yet, warned with the deadline still ahead, or deadline passed. Per case: send the warning, switch the ground, block, ban, remove from the list.
- **The warning form**: a modal with the user's address filled in and read-only, and a text field for the message. On send the admin sees a success notice. This form is the only place the admin writes an email.
- **Standard action emails, sent automatically** with no form and no admin step: after a successful block, ban, or admin delete of a poem or a collection, the user gets a fixed email that names the action and the reason (the ground of their open case, or a general one). Sending can fail without undoing the action; the admin is told.
- **The deadline is a reminder, not a lock.** One day after the warning the case shows «срок истёк»; nothing blocks automatically and no scheduler runs. The admin decides.
- **Admin-facing failure notices** for the cases that can happen mid-flow: a lost connection, a server error, a retry (never a second email), and the case, user, poem or collection changed in another tab (already blocked, banned, removed, or deleted).
- **Email delivery** through Resend: a new server-only module, two new server-only environment variables, and no service-role key.
- **About page rules**: the About text lives in Contentful, not in the repo. The change checks the live text against the two grounds and writes proposed wording for the owner to paste into Contentful. It does not edit Contentful.

## Capabilities

### New Capabilities

- `violation-review`: the review list, the cases and their grounds, status and deadline, adding from the public pages and by drag and drop, and removing or resolving a case.
- `moderation-notifications`: the email delivery module, the warning form, the automatic standard emails after restricting actions, and how failures and retries surface to the admin.

### Modified Capabilities

- `admin-moderation`: the `/admin` list loses its email filter and gains the link and the drop target (`admin-moderation` FR-3); block, ban and the two admin deletes now also send the standard email and close the user's open case (`admin-moderation` FR-4, FR-5, FR-8, FR-9); the audit log records the new events (`admin-moderation` FR-11).

## Requirements

Acceptance criteria as Given/When/Then are in the delta specs.

- **FR-1** An admin adds a user to the review list with a ground; one open case per user; admins and the admin themself cannot be added.
- **FR-2** The public author, poem and collection pages show an admin-only «add to list» control on other people's content, and record which content prompted it.
- **FR-3** `/admin` drops the email filter, shows the list link at the top, and accepts a dragged user row on it (and offers a button per row).
- **FR-4** `/admin/violations` is admin-only, never cached, and lists the open cases with email, author name, ground and status.
- **FR-5** A case's status is derived: waiting, warned, or deadline passed; the deadline is the warning time plus one day, never stored.
- **FR-6** The warning modal shows the address read-only and takes a message; success shows a notice; one warning per case, and only for `harmful-content`.
- **FR-7** The admin can switch a case's ground and remove a case from the list.
- **FR-8** `malicious-activity` can be blocked or banned at once with no warning; for `harmful-content` the block or ban is available at any time, with a hint when there is no warning or the deadline has not passed (reminder, not a lock).
- **FR-9** After a successful block, ban, or admin delete of a poem or a collection, the user gets the standard email automatically; its text depends on the action and the ground; a send failure leaves the action done and tells the admin.
- **FR-10** A block or ban closes the user's open case.
- **FR-11** The warning is checked before it is sent, sent under a stable key, and recorded only after the email service accepts it: a retry within the key's window never delivers a second email or restarts the deadline, and a failed send leaves the case waiting with the text kept.
- **FR-12** Every case event (added, ground switched, warning sent, notice sent or failed, removed) is written to the audit log; a block or ban that closes a case is logged by its own existing row.
- **FR-13** The About text is checked against the grounds and proposed wording is written for the owner.
- **FR-14** A failed standard email is retried once and never undoes the action; the admin is told the action was done but the email was not sent.
- **FR-15** Failure notices to the admin for every action of this change: no connection, server error, session ended, and a case, user, poem or collection changed in another tab.
- **NFR-1** No service-role or secret database key; the new variables are server-only; no log line, error or result holds the API key, an address, or a message body.
- **NFR-2** Every new database function is `security definer`, starts with the admin check, and is closed to the web like the existing admin functions.
- **NFR-3** The email module is server-only, validates its config lazily, returns failures as values, and times out.
- **NFR-4** The new admin controls on public pages arrive through an admin-only slot inside their own `Suspense` and do not change those pages' rendering mode.

## Impact

- **Database**: a new migration: a `violation_cases` table (no client grants), admin functions to add, list, switch the ground of, remove, and warn on a case, and the block, ban, and admin delete functions extended to close the case and to return the address and ground their notice needs. New `moderation_log` event names.
- **Code**: `src/shared/lib/email/` (new), `src/features/admin/` (the list page changes, the case actions, the warning modal, the automatic notice step after the four actions), `src/app/(authorized)/admin/violations/page.tsx` and its `@breadcrumbs` slot page, and the admin-only slot on the public author, poem and collection pages.
- **Dependencies**: none new if the module calls Resend's HTTP API with `fetch`, like the Telegram module.
- **Config and deploy**: `RESEND_API_KEY` and `EMAIL_FROM` (a sender address on a domain verified in Resend), `docs/environment.md`'s variables and Deploy checklist, a new ADR for the email boundary.
- **Docs**: the About rules proposal; the privacy policy (also Contentful) may need a line saying the email service processes addresses, noted for the owner, not changed here.
- **Risk**: high (permissions, database schema, security, external service, messages that act on users). Needs the Feature Spec, Architecture Review, Code Review, deep review, tests, and manual validation.

## Mockups

Approved Claude Design canvas (the same canvas as `admin-moderation`'s; artboard numbers are the canvas's own, each artboard has light and dark, desktop and mobile frames): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z

| Screen | Artboard | Link |
| --- | --- | --- |
| `/admin` user list: no search, grip handles, «Список нарушителей» link, «В список нарушителей» button, drag state, page 2 | 41 · `AdminUsers.dc.html` (updated) | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminUsers.dc.html |
| `/admin` add result (added, already on the list) and no connection | 48 · `AdminUsersViol.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminUsersViol.dc.html |
| `/admin` add failures | 48 · `AdminUsersViolErrors.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminUsersViolErrors.dc.html |
| Dialog «Добавить в список нарушителей?»: from `/admin`, author page, poem page, collection page; sending; no connection | 48 · `AdminViolDialog.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminViolDialog.dc.html |
| The same dialog: errors | 48 · `AdminViolDialogErrors.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminViolDialogErrors.dc.html |
| `/admin/violations`: the list with three statuses, and empty | 49 · `AdminViolations.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminViolations.dc.html |
| `/admin/violations`: loading, list error, cap line, no connection, row in progress | 49 · `AdminViolationsStates.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminViolationsStates.dc.html |
| `/admin/violations`: block and ban results (email sent, not sent, no address) | 49 · `AdminViolationsResults.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminViolationsResults.dc.html |
| `/admin/violations` row: ground switched, warning sent, already warned, case gone | 49 · `AdminViolationsRowA.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminViolationsRowA.dc.html |
| `/admin/violations` row failures | 49 · `AdminViolationsRowB.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminViolationsRowB.dc.html |
| Dialog «Предупреждение пользователю»: all states | 50 · `AdminWarnDialog.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminWarnDialog.dc.html |
| Block and ban confirmations before the deadline | 51 · `AdminEarlyBlock.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminEarlyBlock.dc.html |
| Author page: admin block with «В список нарушителей (админ)», results, failures | 52 · `AdminViolAuthor.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminViolAuthor.dc.html |
| Poem page: add button next to delete, results, failures | 52 · `AdminViolPoem.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminViolPoem.dc.html |
| Collection page: add button next to delete, results, failures | 52 · `AdminViolCollection.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminViolCollection.dc.html |
| Author page after an admin delete: the one-time «email not sent» notices | 53 · `AdminAfterDelete.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminAfterDelete.dc.html |

Observations from the mockups that the specs leave open (confirmed by the canvas, to keep in `ui-plan`):

- The «В список нарушителей» row button shows only on active rows: blocked, banned and admin rows have none, which matches `violation-review` FR-1 (a restricted user is refused).
- «Сменить основание» is a plain button; the mockup shows only its result («Основание изменено», the ground pill updated), so it is read as flipping to the other of the two grounds in one click.
- The standard-email result lines in the list are «…Письмо отправлено» (success), «…но письмо не отправлено» and «…адреса почты нет» (neutral), for block and for ban.
- No new token: the status and ground pills reuse the existing border and colour roles.

## Assumptions

- Emails are in Russian, like the rest of the site.
- Revoking sessions and unblocking send no email: neither restricts the user.
- Harmful content is acted on with the tools that exist: delete the poem or collection, or block or ban the author. This change adds no new way to hide content.
- The list has no paging in this change: it returns at most 100 open cases, newest first. Cases are added by hand, so the list is short; paging is a later change if it grows.
- The warning is sent once per case; a second warning is refused.

## Open Questions

None blocking. Ground wording, email copy, and the About wording are drafts for the owner to confirm.
