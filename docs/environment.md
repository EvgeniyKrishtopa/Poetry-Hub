# Environment variables

Read before adding, renaming, or reading an environment variable.

- `.env.example` (committed) lists every variable **by name only** — never put a value in it. Real values live in `.env.local` (git-ignored) and on the hosting platform.
- Contentful: `CONTENTFUL_SPACE_ID`, `CONTENTFUL_ACCESS_TOKEN` (Content Delivery API token), optional `CONTENTFUL_ENVIRONMENT` (defaults to `master`). Server-only: never prefix them with `NEXT_PUBLIC_`.
- They are validated lazily on each call; a missing or malformed value fails as a `config` error naming the variable, never its value.
- `CONTENTFUL_REVALIDATE_SECRET` gates the publish webhook `POST /api/revalidate`, which expires every Contentful-cached fetch (the `contentful` tag) immediately. Unset or empty → the endpoint fails closed with 503. Generate one with `openssl rand -hex 32`, and set the same value in `.env.local`, on the hosting platform, and in the webhook.
- Webhook setup (manual, Contentful → Settings → Webhooks; see design D10 in `openspec/changes/add-contentful-home-greeting/design.md`, or its archived copy): URL `https://<deployed-host>/api/revalidate`, method POST, triggers Entry → Publish and Unpublish, custom header `x-contentful-webhook-secret: <secret>`. Contentful can't reach `localhost`, so test locally with `curl`. To rotate, change the env var and the webhook header together.
- Supabase: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the `sb_publishable_…` key). The server client and the proxy's session refresh read them. They are public by design (the publishable key is meant to be exposed), carry the `NEXT_PUBLIC_` prefix, and are read as literal `process.env.NEXT_PUBLIC_…` accesses, since Next inlines only literal accesses.
  - Only the publishable key is ever used. Never add a secret or service-role key; nothing in `src/` may read one.
  - URL rule: `https://` with any host, or `http://` only for `localhost` / `127.0.0.1` (a local Supabase CLI instance).
  - Validated lazily on each client creation by `getSupabaseConfig()` in `src/shared/lib/supabase/config.ts`; a bad value raises `SupabaseConfigError` naming the variable, never its value.
  - `NEXT_PUBLIC_SUPABASE_URL` is also read **at build time**: `next.config.ts` derives `images.remotePatterns` from it (the `author-photos` and `poem-illustrations` public bucket paths, `src/shared/config/supabase-image-patterns.ts`). A build without it still succeeds but allows no remote image host, so author photos and poem illustrations fail to render; set it in the hosting platform's build environment, not only at runtime.
  - Local stack: `npx supabase start` (needs Docker; reads `supabase/config.toml`; the CLI is a pinned devDependency). `npx supabase status` prints the local API URL and publishable key to copy into `.env.local`; never commit them.
  - Schema changes are versioned migrations in `supabase/migrations/` (`<UTC timestamp>_<name>.sql`; each documents its down migration in a header comment). Locally, `npx supabase db reset` re-creates the database and applies them all; storage buckets are also declared in `supabase/config.toml` for the local stack. At deploy, `npx supabase db push` applies new migrations to the remote project, before the app that needs them ships.
  - `supabase/seed.sql` is local test data: six sign-in accounts sharing a placeholder password written in the repo. `npx supabase db reset` loads it locally. Never pass `--include-seed` to `db push`, never run `supabase bootstrap` against a hosted project, and before turning on Supabase Branching add a `[remotes.<branch>.db.seed] enabled = false` override: each of these loads the seed into a hosted database.
- Supabase dashboard setup (manual; see the Migration Plan in `openspec/changes/add-supabase-auth/design.md`, or its archived copy):
  1. Authentication → URL Configuration: Site URL `http://localhost:3000` for dev (the deployed URL at deploy time); add both to Redirect URLs.
  2. Authentication → Emails → "Confirm sign up": the link `href` becomes `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
  3. Authentication → Providers → Email: "Confirm email" on; minimum password length 8.
  4. Authentication → Rate Limits: raise "sign-ups and sign-ins" above the default 30 per 5 minutes. Every sign-in and sign-up runs in a Server Action, so they all reach Supabase from the server's IP and share one per-IP budget; forwarding each reader's IP would need a secret key, which this project does not use.
- Telegram (the contact form's delivery): `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. Server-only: never prefix them with `NEXT_PUBLIC_`. Only `src/shared/lib/telegram/` reads them (every module there starts with `import "server-only"`), and no log line, error, or action result holds either value or the request URL, which carries the token.
  - Token: in Telegram, message [@BotFather](https://t.me/BotFather), send `/newbot`, and copy the token it returns (`<bot id>:<secret>`).
  - Chat id: send any message to the new bot (or add it to the group that should receive requests), then open `https://api.telegram.org/bot<token>/getUpdates` and copy `result[].message.chat.id`. A private chat has a positive id; a group or channel has a negative one.
  - Validated lazily on each send: the token must be `<digits>:<letters, digits, _ or ->` and the chat id an integer. Unset or malformed → the app still builds and runs, but every contact form submit shows the failure alert, and the server logs `[contact] send failed` with reason `config` (never the value).
  - Deploy step: the contact form has no app-level rate limit (ADR 0007 point 5). Add a per-IP rate rule at the hosting layer (Vercel Firewall or Cloudflare) that covers Server Action POSTs.
  - Rotation: in @BotFather, `/revoke` the bot's token to get a new one (the old one stops working at once), then update `TELEGRAM_BOT_TOKEN` in `.env.local` and on the hosting platform.
- Resend (the admin's warning and action emails): `RESEND_API_KEY` and `EMAIL_FROM`. Server-only: never prefix them with `NEXT_PUBLIC_`. Only `src/shared/lib/email/` reads them (every module there starts with `import "server-only"`), and no log line, error, or result holds the key, a recipient address, or a message body. The key is a server secret for one outside service, not a database key: the "only the publishable key" rule for Supabase above still holds.
  - API key: in the Resend dashboard, API Keys → Create API Key with the "Sending access" permission, and copy the `re_…` value (shown once).
  - Sender: `EMAIL_FROM` is `name@your-domain.tld` or `Display Name <name@your-domain.tld>`, on a domain verified in Resend (Domains → Add Domain, then add the DNS records it lists and wait for "Verified"). Without a verified domain Resend refuses every send.
  - Validated lazily on each send: the key must start with `re_` and hold no whitespace, and the sender must be an address, with or without a display name. Unset or malformed → the app still builds and runs, but every email shows as not sent to the admin, and the server logs reason `config` naming the variable, never its value.
  - Rotation: in the Resend dashboard create a new key, update `RESEND_API_KEY` in `.env.local` and on the hosting platform, then delete the old key.

## Deploy checklist

Manual steps before the app that needs them ships, in each environment. Kept here, not in the
git-ignored `PROGRESS.md`, so every clone sees them.

- **Poems migration** (`add-poem-creation`): `npx supabase db push` applies `20261028160000_poems.sql`
  (the `poems` table, `create_my_poem` / `can_create_poem`, the rewritten `author_profiles` public
  policy, the `poem-illustrations` bucket policies). Ship it before the app: without it every poem read
  shows the unavailable state and every create fails. Rollback: revert the app first, then the down migration
  in the file's header.
- **Delete migration** (`delete-poem`): `npx supabase db push` applies `20261029170000_delete_my_poem.sql`
  (`delete_my_poem`, the `poem_creations` log with its trigger and backfill, and `poem_create_status`
  counting creations instead of live poems). Ship it before the app: without it every delete fails
  with the dialog's error alert. Rollback: revert the app first, then the down migration in the
  file's header.
- **Update migration** (`edit-poem`): `npx supabase db push` applies `20261103130000_update_my_poem.sql`
  (`update_my_poem`, and the `poem_edit` scope in `write_rate_limits` and `consume_write_allowance`,
  10 saves per minute). Ship it before the app: without it every save on the edit page fails with
  the form's error alert. Rollback: revert the app first, then the down migration in the file's
  header.
- **Collections migration** (`add-poem-collections`): `npx supabase db push` applies
  `20261104180000_collections.sql` (the private `collections` table, the `collection_creations` log with
  its trigger, `create_my_collection` / `update_my_collection` / `delete_my_collection`, 50 collections
  per 30 days, and the `collection_edit` scope in `write_rate_limits` and `consume_write_allowance`,
  10 saves per minute). Ship it before the app: without it the collections section on `/account/poems`
  shows its error alert and every collection page and write fails. Rollback: revert the app first, then
  the down migration in the file's header.
- **Collection poems migration** (`add-poems-to-collections`): `npx supabase db push` applies
  `20261107140000_collection_poems.sql` (`poems.collection_id` with no client grant and its composite
  foreign key to `collections`, `my_collection_poem_choices` / `my_collected_poems` /
  `save_my_collection_poems`, and the `collection_poems_save` scope in `write_rate_limits` and
  `consume_write_allowance`, 10 saves per minute; ADR 0012). Ship it before the app: without it the
  collection pages and the collections section on `/account/poems` fail their reads. Existing poems
  start free. Rollback: revert the app first, then the down migration in the file's header (every
  membership is lost).
- **Public collections migration** (`public-collections`): `npx supabase db push` applies
  `20261110180000_public_collections.sql` (a select policy and an `anon` column grant that let anyone read
  a public author's non-empty collections, a select grant on `poems.collection_id`, and
  `delete_my_collection` returning `author_id`; ADR 0013). Apply it after the collection poems migration
  and before the app: without it the public collections reads return no rows and `collection_id` can't be
  selected, so the author page fails its poems read. Rollback: revert the app first, then the down
  migration in the file's header.
- **Work ordering migration** (`drag-and-drop-ordering`): `npx supabase db push` applies
  `20261111160000_work_ordering.sql` (`position` on `collections` and `poems` with a newest-first backfill and
  an insert trigger on each, the `move_my_poem` / `move_my_collection` functions, the changed
  `save_my_collection_poems` / `delete_my_collection` / `my_collected_poems`, and the `order_move` scope in
  `write_rate_limits` and `consume_write_allowance`, 30 moves per minute; ADR 0014). Apply it after the public
  collections migration and before the app: an older app keeps working against it (it reads the same rows, only
  without the order), but the board and every read that orders by `position` fail without it. Rollback: revert
  the app first, then the down migration in the file's header (every stored order is lost).
- **Admin moderation migrations** (`admin-moderation`; ADR 0015), in this order and before the app:
  1. `npx supabase db push` applies `20261113170000_admin_moderation.sql` (`admins`, `account_restrictions`,
     `banned_emails`, `moderation_log`, `is_admin()` and the restriction check in every writer and in the profile
     and Storage policies) and `20261113180000_admin_moderation_functions.sql` (the `admin_*` functions, the
     internal delete functions, the admin Storage policies and `reject_banned_signup`). The app before the
     migration calls missing functions. Rollback: revert the app first, then the down migrations in both file
     headers.
  2. Register the **Before User Created hook** in the Supabase dashboard (Authentication → Hooks): type Postgres
     function, schema `public`, function `reject_banned_signup`. The local stack reads it from
     `supabase/config.toml`; the hosted project does not. Without it a banned address can sign up again. The hook
     allows on any error, so a mistake weakens a ban and never blocks every sign-up.
  3. Make the owner the admin, by SQL in the dashboard's SQL editor (nothing in the app grants it):
     `insert into public.admins (user_id) select id from auth.users where email = '<owner email>';`
     Check that the statement inserted one row. Then open `/admin` signed in as the owner.
  4. Run the hosted half of the Auth check (`docs/deferred.md`, `admin-moderation` 2.8): the `postgres` role can
     update `auth.users` and delete `auth.sessions`, and the hook's rejection reaches the app as status 403 with
     the message `signup not allowed`.
- **Admin list migration** (`admin-moderation`, revision 2026-11-17; design D15): `npx supabase db push` applies
  `20261117150000_admin_list_hides_admins.sql` (`admin_list_users` leaves out admins and drops its `is_admin`
  column). On a project that has none of the admin migrations yet, push it with the other two, before the app. On a
  project already running the earlier app, deploy the app first and push this migration after it, never before: the
  earlier app's row schema requires `is_admin`, so its `/admin` list shows the unavailable state against the new
  function. Rollback: revert the app first, then the down migration in the file's header.
- **`poem-illustrations` bucket** (`add-poem-creation`): on the hosted project, confirm it exists,
  public, 5 MiB file size limit, MIME types `image/png` and `image/jpeg` — the same as
  `supabase/config.toml`, which configures the local stack only.
- **Contentful `tag` content type** (`add-poem-creation`): in each Contentful environment, a content type
  with id `tag` and fields `name` and `slug` (both short text, required), plus one published entry per
  genre. Without it the add form shows the genres-unavailable alert and poem pages show no genre line.
- Also before a first deploy: the Supabase dashboard setup and the Contentful webhook above, and the
  hosting-layer per-IP rate rule (Telegram section).
