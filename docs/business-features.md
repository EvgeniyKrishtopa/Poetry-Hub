# Business features

What Poetry Hub does today, from the product's side: who can do what, and the rules that govern it. This is a
catalogue of the behaviour that is built and merged, not a plan. The binding wording of every rule lives in the
capability specs under `openspec/specs/<capability>/spec.md`; each section below names the specs it summarises.
User-facing copy is Russian; this document is English.

Domain terms (collection, free poem) are defined in [`CONTEXT.md`](../CONTEXT.md).

## 1. Product in one paragraph

Poetry Hub is a Russian-language site where readers become **authors**, publish their **poems** (with an optional
illustration and a genre), group them into **collections**, and are read by anyone without signing in. The site
owner (the **admin**) moderates content and accounts and curates the home page. Editorial texts (home banner,
about page, privacy policy, genre list) live in Contentful; everything users create lives in Supabase.

## 2. Roles

| Role | How you become one | Can do |
| --- | --- | --- |
| Visitor (guest) | nothing | read the home page, authors, poems, collections, about and privacy pages; send a contact message; sign up or sign in |
| Reader | sign up (email + password, or Google) | everything a visitor can, plus own account page and author profile |
| Author | a reader whose profile is **public**: first and last name both filled | create, edit, delete, group and order own poems and collections |
| Admin | the owner inserts their user id into `public.admins` by SQL; the app has no way to grant or revoke it | moderate accounts and content, curate the home page, see `/admin` |
| Restricted account | an admin blocks or bans it | cannot sign in or write anything (see section 9) |

## 3. Accounts and sign-in

Specs: `auth`, `google-sign-in`, `password-recovery`, `reader-account`.

- **Sign-up with email and password** (`/signup`): the password has at least 12 characters with a lowercase and
  an uppercase Latin letter, a digit and a symbol. The form is replaced by a "check your email" message; the account is usable after the reader follows the confirmation link
  (`GET /auth/confirm`).
- **Sign-in** (`/login`): wrong credentials show one error, and a recovery offer. A session that expired during
  a write sends the reader to `/login` with a one-time "session expired" notice.
- **Google sign-in**: a button on both forms, through Supabase OAuth (`GET /auth/callback`). A visitor who
  cancels returns to the page they started on with a notice. Starting from `/signup` with an address that
  already has an account signs them in and says so once. Redirect targets are fixed, never read from a request.
- **Password recovery**: after a wrong-credentials sign-in the form offers to email a recovery link. The answer is
  identical whether or not the address has an account (no account enumeration). The link opens `/reset-password`
  with a session that may set a password for 15 minutes; a new password is validated, limited to 5 attempts per minute per account, and on success all
  the account's sessions on every device end and the reader is sent to sign in again. Invalid, expired or reused
  links go back to `/login` with a notice.
- **Sign-out** from the header. While an edit form holds unsaved changes, sign-out asks first.
- **Account page** (`/account`): shows the author section (create or edit the author profile, link to the public
  page, link to poem management when the profile is public). Every page under `(authorized)` needs a session:
  the proxy redirects guests to `/login`, and each page checks the session again.
- **Offline guards**: sign-in-related buttons and write forms are disabled with a notice while the browser is
  offline or on a slow connection.

## 4. Author profile

Specs: `author-profiles`, `author-poems` (author page part).

- One profile per user, edited field by field at `/account/author`: first name, last name, about, photo.
  Each field has its own save and delete, with pending, success and error states.
- **Public rule**: a profile is public exactly when first name and last name are both non-empty. A profile that is
  not public appears nowhere (not in the directory, not at its URL). The database enforces this, not only the app.
- Name fields: 1 to 60 characters each. About: 1 to 1000 characters of Markdown, with a toolbar (bold, italic,
  heading, subheading, bulleted and numbered lists, quote) and an edit/preview toggle. Photo: PNG or JPEG, up to
  5 MB, checked by content rather than by file name.
- Rendered Markdown never contains raw HTML; links and images are shown as plain text.
- **Write limits** per user: 10 profile writes per minute and 5 photo uploads per hour.
- **Author directory** (`/authors`): every public author, sorted by last name, then first name.
- **Public author page** (`/authors/<id>`): full name, photo (or placeholder), about, the author's collections,
  and the author's free poems. The owner additionally sees links to edit the profile and to manage poems.

## 5. Poems

Specs: `poem-management`, `author-poems`.

- **Create** (`/account/poems/new`): title (at most 80 characters), text (at most 10000, Markdown with a poem
  toolbar: bold, italic, epigraph, part divider, indent), genre (required; one of the Contentful genre tags, or
  "no genre"), and an optional illustration (same rules as the profile photo). Only authors with a public profile
  can write.
- **Limit**: at most 100 poems created per author in any rolling 30 days. Deleting a poem does not free a place.
  The limit is enforced by the only database function that can insert a poem, so API calls cannot bypass it.
- **Your poems** (`/account/poems`): the author's collections and free poems; empty and failure states.
- **Owner's poem page** (`/account/poems/<id>`): the poem exactly as the public sees it, plus Edit and Delete.
- **Edit**: change title, text, genre and illustration (replace or remove). The form detects whether anything
  changed, blocks navigation and sign-out while changes are unsaved (with a dialog), and keeps the draft when the
  author hops between the poem page and the edit page. Limit: 10 save attempts per minute per account.
- **Delete**: only from the owner's poem page, behind a confirmation dialog naming the poem. The illustration file
  is removed best-effort. Deleting an already-deleted poem is reported, not an error.
- **Public poem page** (`/authors/<id>/poems/<poemId>`): title, author link, genre, illustration, text rendered from
  safe Markdown, and the collection it belongs to. Missing, malformed or non-public poems render the 404 screen.
- Every write refreshes the affected public pages on the next request, with no wait for a cache lifetime.

## 6. Collections

Specs: `collection-management`, `public-collections`.

- A **collection** is an author's named group of poems: title (required, at most 80 characters) and an optional
  description (at most 1000). A poem belongs to at most one collection, of its own author; a poem in none is
  **free**. New poems start free.
- **Create** (at most 50 per author in any rolling 30 days; deleted ones still count), **edit** (10 saves per
  minute, unsaved-changes guard), **delete** (confirmation dialog; its poems become free and are placed first
  among the free poems).
- **Choose poems** (`/account/poems/collections/<id>/poems`): a checklist of the collection's poems and the
  author's free poems, newest first. Saving applies the whole change atomically, limited to 10 saves per minute,
  with a leave dialog offering to save, discard or stay.
- **Visibility**: a collection is public exactly when its author is public and it holds at least one poem. Empty
  collections and collections of non-public authors are not shown anywhere public.
- **Public pages**: a "collections" section on the author page and a collection page
  (`/authors/<id>/collections/<collectionId>`) with title, description and the poems in the author's order. Both
  look identical to every visitor, signed in or not.

## 7. Ordering by drag and drop

Spec: `work-ordering`.

- On `/account/poems` an author drags to: reorder poems inside a collection, move a poem between collections,
  move a poem between a collection and the free poems, and reorder collections (a collection's poems travel with it).
- Every drop is saved at once. Collections cannot be dropped into collections or among poems.
- Works with mouse, touch and keyboard: each item has a drag handle button with an accessible name; Space picks
  up, arrows move.
- The stored order is the single source for every list: public author page, public collection page, own pages.
  New poems and collections go first; adding a poem to a collection puts it first there.
- **Stale moves** (another tab changed things): nothing is stored, the board refreshes and shows an alert.
- Limit: 30 moves per minute per author.

## 8. Home page and editorial content

Specs: `home-sections`, `home-banner`, `home-curation`, `home-greeting`, `about-page`, `privacy-policy-page`,
`content-revalidation`, `contentful-client`.

- **Hero**: title, text and image from the Contentful Home banner entry (the most recently published one), with a
  uniform 50% dark overlay and two buttons (read poems, become an author). If Contentful fails, a static hero
  shipped with the site renders instead.
- **Featured poems** and **project authors**: up to 4 each, chosen by the admin (section 10), in the admin's order.
  Author cards show a description cut to 120 characters of plain text.
- **About the project** and **closing invitation** (shown to signed-out visitors): texts from Contentful greeting
  entries with static fallbacks.
- **Latest publications**: the 4 newest poems of public authors.
- **Sections fail independently**: a failed read leaves that section out, never the whole page.
- **About** (`/about`) and **Privacy** (`/privacy`): Contentful greeting entries (`about_page`, `privacy_policy`).
  Blank lines split paragraphs; on the privacy page paragraph lines starting with "Раздел N." or "N." become
  headings. A failure shows the app's error screen.
- **Freshness**: `POST /api/revalidate` is a Contentful publish webhook, authenticated by a shared secret, which
  expires all Contentful-cached content immediately. Without it, published changes appear within minutes.

## 9. Moderation

Specs: `admin-moderation`, `violation-review`, `moderation-notifications`.

All admin power lives in guarded SQL functions that check `is_admin()` first and are closed to the web; the app
uses only the publishable key, never a service-role key.

- **Admin area** (`/admin`): admins only. Guests go to `/login`; signed-in non-admins get the same not-found screen
  as an unknown URL; an unreadable check shows "service unavailable". The header shows an admin link to admins only.
- **User list**: newest first, 10 per page with keyset paging in the URL; shows email, author name, join and last
  sign-in dates, and state (active, blocked, banned). Admins are not listed.
- **Block / unblock**: ends all sessions, sets an auth ban so sign-in and refresh are refused; reversible.
- **Ban**: like block, and the SHA-256 hash of the lower-cased email goes to a ban list so the address cannot sign
  up again (rejected by a Before User Created auth hook, with the same response as a normal sign-up).
- **Revoke sessions** of a user.
- Admins cannot moderate themselves or other admins.
- **Delete any poem or collection** from its public page (control shown to admins on content they do not own).
- **Restricted accounts** are refused by every write of user content with a dedicated error, before any row changes;
  each form shows one message that the account is blocked. Sign-in shows a generic blocked message without a reason.
- **Audit log**: every successful admin change appends a row (admin, action, target, time) in the same
  transaction. No email addresses or message bodies are stored there.
- **Violation review list** (`/admin/violations`): an admin adds a user (from a public page, or by dragging a row
  onto the list link) with one of two grounds, `harmful-content` or `malicious-activity`, optionally tied to a poem
  or collection. One open case per user. Status is derived, never stored: waiting, warned (warning under 24 hours
  old), deadline passed. The admin can switch the ground, remove the case, send a warning, block or ban. Blocking
  or banning closes the case. Blocking a harmful-content case before its deadline asks for confirmation.
- **Warning email**: written by the admin (at most 2000 characters), sent through Resend under an idempotency key
  so a retry never sends twice or restarts the deadline; the case becomes warned only after the service accepts it.
  The text is not stored.
- **Standard emails** go automatically after a block, ban, or admin deletion, stating the action and the reason.
  A failed email never undoes the action; it is retried once, recorded as failed, and the admin is told.

## 10. Home page curation

Spec: `home-curation`.

- Admins see a "show on home page" control on every public poem and author page.
- `/admin/home` lists chosen poems and authors (at most 4 each); drag to reorder within a list, remove entries.
- Limits and uniqueness are enforced in the database. A poem or author that is deleted or stops being public
  disappears from the home page; deleted ones free their slot.
- A successful change shows on the next request to `/`.

## 11. Contact form

Spec: `contact-form`.

- A footer button opens a dialog open to everyone: name (1 to 80), email (valid, at most 254), message (optional,
  at most 300). Validated by one Zod schema in the browser and again on the server.
- Delivered as one Telegram Bot API message. Failures (missing settings, timeout after 10 seconds, API error) keep
  the form with an error. Success shows a thank-you and closes the dialog after 3 seconds.
- A hidden honeypot field makes bots look successful while nothing is sent.
- Closing the dialog keeps unsent input.

## 12. Navigation and shared UI

Specs: `breadcrumbs`, `site-footer`, `route-states`, `route-groups`, `feedback-tones`.

- **Header**: site link, authors link, session part (sign in or sign out), admin link for admins.
- **Breadcrumbs** on every page except home, per route, consistent for every visitor, following client-side
  navigation; none on unknown URLs.
- **Footer**: copyright from the founding year to the current year, links to about and privacy, contact button.
- **Route states**: branded not-found, error (with retry) and loading screens; error details are never shown.
- **Feedback**: shared danger and success tones for every message, with contrast requirements.

## 13. Search engines and sharing

Specs: `page-metadata`, `crawler-discovery`.

- Every public page has its own title (site-name template), description from its text, absolute canonical URL,
  Open Graph and Twitter tags; the share image is the poem illustration, the author photo, or a default image.
- `/account`, `/admin`, `/login`, `/signup` and `/reset-password` are `noindex`.
- Missing or non-public content is `noindex` and shows the not-found screen.
- `/robots.txt` allows public pages and disallows `/account`, `/auth`, `/api`; `/sitemap.xml` lists the home page,
  directory, about, privacy, and every public author, poem and non-empty collection.
- The public address comes from `SITE_URL` (falling back to Vercel's production URL).

## 14. Cross-cutting rules

- **Security**: Supabase RLS on every table; row-creating and write operations go through `security definer`
  functions that derive the owner from the session; per-user write limits live in Postgres (ADR 0007);
  security headers on every page response; no secrets, content or ids in logs (error kind only).
- **Accessibility**: one `h1` per page, labelled controls, errors linked by `aria-describedby`, status and alert
  roles for notices, modal dialogs with focus management, keyboard-operable drag and drop.
- **Rendering**: public pages are cached or partially prerendered and session-free; account, admin and
  reset-password pages render per request.
- **Language**: all user-facing copy is Russian and verbatim from each change's UI copy table.

## 15. Limits at a glance

| Rule | Value |
| --- | --- |
| New password | at least 12; lowercase, uppercase, digit, symbol |
| Profile name fields | 1 to 60 each |
| About | 1 to 1000 |
| Photo / illustration | PNG or JPEG, up to 5 MB, by content |
| Profile writes / photo uploads | 10 per minute / 5 per hour per user |
| Poem title / text | at most 80 / 10000 |
| Poem creation | 100 per rolling 30 days per author |
| Poem edit saves | 10 per minute per user |
| Collection title / description | at most 80 / 1000 |
| Collection creation | 50 per rolling 30 days per author |
| Collection edit saves, collection poems saves | 10 per minute each |
| Drag-and-drop moves | 30 per minute |
| New-password attempts | 5 per minute per account |
| Home page picks | 4 poems and 4 authors |
| Admin user list page | 10 |
| Review list | at most 100 open cases shown |
| Warning period | 24 hours |
| Warning message | at most 2000 |
| Contact name / email / message | 1 to 80 / at most 254 / at most 300 |
