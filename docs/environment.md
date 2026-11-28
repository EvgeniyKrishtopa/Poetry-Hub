# Environment variables

Read before adding, renaming, or reading an environment variable.

- `.env.example` (committed) lists every variable **by name only** — never put a value in it. Real values live in `.env.local` (git-ignored) and on the hosting platform.
- Contentful: `CONTENTFUL_SPACE_ID`, `CONTENTFUL_ACCESS_TOKEN` (Content Delivery API token), optional `CONTENTFUL_ENVIRONMENT` (defaults to `master`). Server-only: never prefix them with `NEXT_PUBLIC_`.
- They are validated lazily on each call; a missing or malformed value fails as a `config` error naming the variable, never its value.
- `CONTENTFUL_REVALIDATE_SECRET` gates the publish webhook `POST /api/revalidate`, which expires every Contentful-cached fetch (the `contentful` tag) immediately. Unset or empty → the endpoint fails closed with 503. Generate one with `openssl rand -hex 32`, and set the same value in `.env.local`, on the hosting platform, and in the webhook.
- Webhook setup (manual, Contentful → Settings → Webhooks; see design D10 in `openspec/changes/add-contentful-home-greeting/design.md`, or its archived copy): URL `https://<deployed-host>/api/revalidate`, method POST, triggers Entry → Publish and Unpublish **and Asset → Publish and Unpublish** (an editor who swaps the hero photo by publishing the asset alone would otherwise wait for the 60 s cache lifetime), custom header `x-contentful-webhook-secret: <secret>`. Contentful can't reach `localhost`, so test locally with `curl`. To rotate, change the env var and the webhook header together.
- `CONTENTFUL_SPACE_ID` is also read **at build time**: `next.config.ts` derives one `images.remotePatterns` entry from it (`https://images.ctfassets.net/<space id>/**`, `src/shared/config/contentful-image-patterns.ts`), and the home banner accepts an image URL only when it matches the same rule at runtime. Set the same value in the hosting platform's build environment and at runtime. A build without it succeeds but allows no Contentful image; a runtime without it makes the banner read fail as `config`. Either way the hero shows the static photo.
- Home page content in Contentful (`home-contentful-content`; until each is published the page shows its static copy):
  - One **Home banner** entry (API ID `homeBanner`; fields `title` and `description`, a Long text shown as plain-text paragraphs, and `bannerImage`, an asset). If several are published, the most recently published one is used. The hero shows the entry only when the title, description and image are all valid; otherwise it shows the site name, the site description and the shipped photo.
  - **Banner image** guidance: about 2000 px wide, and dark enough under the text. The hero has a 50% black overlay, so the lightest pixel in the middle 60% of the photo's height may be `#ececec` (the value in `docs/design-system.md`); a lighter photo makes the white text hard to read.
  - Two **Greeting** entries, by key: `about_project_home` (the about section's heading and text) and `call_to_action_signup` (the closing invitation's heading and text, shown to signed-out visitors only). The old `home_greeting` entry is no longer read and can be deleted.
- Supabase: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the `sb_publishable_…` key). The server client and the proxy's session refresh read them. They are public by design (the publishable key is meant to be exposed), carry the `NEXT_PUBLIC_` prefix, and are read as literal `process.env.NEXT_PUBLIC_…` accesses, since Next inlines only literal accesses.
  - Only the publishable key is ever used. Never add a secret or service-role key; nothing in `src/` may read one.
  - URL rule: `https://` with any host, or `http://` only for `localhost` / `127.0.0.1` (a local Supabase CLI instance).
  - Validated lazily on each client creation by `getSupabaseConfig()` in `src/shared/lib/supabase/config.ts`; a bad value raises `SupabaseConfigError` naming the variable, never its value.
  - `NEXT_PUBLIC_SUPABASE_URL` is also read **at build time**: `next.config.ts` derives `images.remotePatterns` from it (the `author-photos` and `poem-illustrations` public bucket paths, `src/shared/config/supabase-image-patterns.ts`). A build without it still succeeds but allows no remote image host, so author photos and poem illustrations fail to render; set it in the hosting platform's build environment, not only at runtime.
  - Local stack: `npx supabase start` (needs Docker; reads `supabase/config.toml`; the CLI is a pinned devDependency). `npx supabase status` prints the local API URL and publishable key to copy into `.env.local`; never commit them.
  - Schema changes are versioned migrations in `supabase/migrations/` (`<UTC timestamp>_<name>.sql`; each documents its down migration in a header comment). Locally, `npx supabase db reset` re-creates the database and applies them all; storage buckets are also declared in `supabase/config.toml` for the local stack. At deploy, `npx supabase db push` applies new migrations to the remote project, before the app that needs them ships.
  - `supabase/seed.sql` is local test data: six sign-in accounts sharing a placeholder password written in the repo. `npx supabase db reset` loads it locally. Never pass `--include-seed` to `db push`, never run `supabase bootstrap` against a hosted project, and before turning on Supabase Branching add a `[remotes.<branch>.db.seed] enabled = false` override: each of these loads the seed into a hosted database. Never run `supabase db reset` with `--linked`, or with `--db-url` pointing at a hosted database: it wipes that database before seeding it, so the seed's guard against real accounts finds none and passes.
- Supabase dashboard setup (manual; see the Migration Plan in `openspec/changes/add-supabase-auth/design.md`, or its archived copy):
  1. Authentication → URL Configuration: Site URL `http://localhost:3000` for dev (the deployed URL at deploy time); add both to Redirect URLs.
  2. Authentication → Emails → "Confirm sign up": the link `href` becomes `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
  3. Authentication → Providers → Email: "Confirm email" on; minimum password length 12 and required characters "lowercase, uppercase letters, digits and symbols" (ADR 0028).
  4. Authentication → Rate Limits: raise "sign-ups and sign-ins" above the default 30 per 5 minutes. Every sign-in and sign-up runs in a Server Action, so they all reach Supabase from the server's IP and share one per-IP budget; forwarding each reader's IP would need a secret key, which this project does not use.
- Google sign-in (`google-sign-in`; ADR 0019): Supabase Auth's Google provider, configured outside the app. The app reads no new variable: it starts the flow with `signInWithOAuth` (`redirectTo` = `getSiteUrl()` + `/auth/callback?from=sign-in|sign-up`, `GOOGLE_CALLBACK_PATH` and `GOOGLE_FLOW_PARAM` in the auth feature) and finishes it at the route `/auth/callback`.
  - Google Cloud (owner, manual): APIs & Services → OAuth consent screen with the site's name, then Credentials → Create credentials → OAuth client ID, type "Web application". Its **Authorized redirect URI** is the Supabase project's own callback, `https://<project-ref>.supabase.co/auth/v1/callback`, not the site's `/auth/callback`: Google returns to Supabase, and Supabase returns to the site. For the local stack add `http://127.0.0.1:54321/auth/v1/callback` to the same client or a second one.
  - Hosted Supabase: Authentication → Providers → Google, enabled, with that client's id and secret. Authentication → URL Configuration: the Site URL equals what `getSiteUrl()` returns (the Site address section below), and Redirect URLs contain exactly the two addresses the app sends, `<site>/auth/callback?from=sign-in` and `<site>/auth/callback?from=sign-up` (in Supabase's glob a `?` matches any one character, so each still matches itself). Never a `<site>/auth/callback**` pattern: `**` matches any characters, `/` included, so it would accept almost any return address on the site, and a code sent there could leak (Supabase recommends exact redirect URLs in production).
  - A `redirectTo` that matches no Redirect URL is **not an error**: Supabase silently sends the visitor to the Site URL root with `?code=`, so they land on `/` signed out with no notice. If a Google sign-in ends that way, check the Redirect URLs pattern first.
  - Rate limit: the code exchange at `/auth/callback` calls `/auth/v1/token` (PKCE grant) from the app server. It counts against Authentication → Rate Limits → "token refreshes" (`token_refresh` in `supabase/config.toml`), the same per-IP budget as password sign-ins and session refreshes, all from the server's one IP (ADR 0003). Starting the flow counts against nothing in the app's budget: the browser goes to `/auth/v1/authorize` itself.
  - Local stack: `[auth.external.google]` in `supabase/config.toml` reads `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` through `env(...)`. They belong to the Supabase CLI's environment (`supabase/.env`, git-ignored, or the shell that runs `npx supabase start`), never to the app's `.env*` files, and never in the repository. `supabase/.env.example` lists their names without values: copy it to `supabase/.env` and fill them in. Restart the stack (`npx supabase stop && npx supabase start`) after changing them.
- Password recovery (`password-recovery`; ADR 0021, ADR 0022): Supabase Auth sends the letter, the app reads no new variable. The app asks for it with `resetPasswordForEmail` (`requestRecoveryAction`), opens its link at `/auth/confirm?type=recovery` (`confirmRecovery`), and sets the password on `/reset-password` (`updatePasswordAction`).
  - Letter template: the local stack reads `[auth.email.template.recovery]` in `supabase/config.toml` (subject and `content_path = "./supabase/templates/recovery.html"`). The hosted project does not: paste the same subject and body into Authentication → Emails → "Reset password". The link must be exactly `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`: the app's own route, the token hash and no address. The Russian wording is a placeholder until the owner confirms it.
  - Link lifetime: `otp_expiry = 3600` (1 hour) in `[auth.email]`. The letter and the app's «sent» notice say «1 час», so change all three together, and set the same value on the hosted project (Authentication → Providers → Email, or the Auth settings that hold the email OTP expiry).
  - Pause between letters: `max_frequency` in `[auth.email]` is `1s` locally (so a manual run is not slowed) and `60s` by default on the hosted project. A second request for the same address inside that pause is refused with `over_email_send_rate_limit`; the app answers it as «sent» on purpose (design D3), so a reader sees no difference between a known and an unknown address. The refusal is logged by name only (`[auth] recovery letter refused: email send limit`).
  - Letter cap and sender: the hosted project's built-in sender is limited to a few letters per hour and is meant for testing. Before launch set a custom SMTP sender (Authentication → Emails → SMTP Settings) and raise the email rate limit (Authentication → Rate Limits), or recovery letters stop arriving once the hour's cap is hit while the app still says «sent». The `[auth.email.smtp]` block in `supabase/config.toml` is commented out and stays local-only.
  - New-password limit: `consume_write_allowance('password_reset')`, 5 attempts per minute per account (`20261125150000_password_reset_limit.sql`, ADR 0007). It bounds the app's own path only.
  - A blocked or banned account: the letter is still sent, and its link opens no session (`verifyOtp` answers `user_banned`). Every other way in is closed too; the hosted checks are step 4 of the Deploy checklist item below.
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
- Site address (`seo-metadata`): `SITE_URL`, optional. Server-only: never prefix it with `NEXT_PUBLIC_`. Only `getSiteUrl()` in `src/shared/lib/seo/site-url.ts` reads it. It is the origin every canonical link, `og:url`, share-image URL, `robots.txt` sitemap line and sitemap entry is built on.
  - Value: an absolute `http(s)` URL, for example `https://poetry-hub.example`. Any path, trailing slash, query or hash is dropped, so only the origin is used.
  - Fallbacks, in order: `SITE_URL`; then `https://` plus `VERCEL_PROJECT_PRODUCTION_URL` (a system variable Vercel sets, the project's production host without a scheme); then `http://localhost:3000`. A build, a test or a local run with nothing set works on the last one.
  - An unset or empty value is skipped without a message. A value that is not an absolute `http(s)` URL is skipped too and logged once per server process as `[seo] SITE_URL is not an absolute http(s) URL, using the next fallback`, naming the variable, never its value. It never fails a build or a request.
  - Set it only when the final address differs from Vercel's production URL (for example a custom domain): until then the Vercel fallback already gives the right address. Set it in the Vercel Production environment for both the build and the runtime: `robots.txt` and the fixed pages' `metadata` are built at build time, the rest at request time. Preview deployments inherit the production address for canonical links, which is acceptable because Vercel marks previews `noindex` itself.

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
- **Violation review migration and Resend** (`admin-violations-feedback`; ADR 0016), in this order:
  1. `npx supabase db push` applies `20261117170000_violation_review.sql` (`violation_cases`, the guarded
     `admin_*_violation_case` and warning functions, and the extra `notice_email`, `ground` and `user_id` keys
     in the answers of block, ban and the two admin deletes). Push it **before the app**: an old app keeps
     working against it, but the new app's review list and notices call functions that do not exist without it.
     Apply it after the admin moderation migrations. Rollback: revert the app first, then the down migration in
     the file's header (every open case is lost).
  2. Set `RESEND_API_KEY` and `EMAIL_FROM` on the hosting platform (the Resend section above) and finish the
     sender-domain verification in Resend first: until the domain shows "Verified" every send fails, the
     warning stays `waiting` and a block, ban or delete shows the "email not sent" notice.
  3. Send one warning and one block notice to an address you control and check the text and the reason
     (`docs/deferred.md`, `admin-violations-feedback` 6.4, if it is still open).
  4. Owner's own work, outside the code: paste the wording from `docs/about-rules-proposal.md` into the About
     page in Contentful, and review the privacy policy for the new email use of an account's address.
- **Home featured migration** (`home-page-sections`): `npx supabase db push` applies
  `20261121140000_home_featured.sql` (the `home_featured_poems` and `home_featured_authors` tables with no client
  grant, the guarded `admin_add_home_poem` / `admin_add_home_author` / `admin_move_home_entry` /
  `admin_remove_home_entry` / `admin_list_home_entries`, and `home_featured_ids()` for the public page). Apply it
  after the admin moderation migrations and **before the app**: without it the featured sections and the
  authors section stay hidden (the home page shows its other sections) and `/admin/home` shows its error alert.
  No new variable. Rollback: revert the app first, then the down migration in the file's header (the chosen lists
  are lost). After the first deploy, an admin picks the poems and authors on `/admin/home`; until then those two
  sections are not shown.
- **`poem-illustrations` bucket** (`add-poem-creation`): on the hosted project, confirm it exists,
  public, 5 MiB file size limit, MIME types `image/png` and `image/jpeg` — the same as
  `supabase/config.toml`, which configures the local stack only.
- **Contentful `tag` content type** (`add-poem-creation`): in each Contentful environment, a content type
  with id `tag` and fields `name` and `slug` (both short text, required), plus one published entry per
  genre. Without it the add form shows the genres-unavailable alert and poem pages show no genre line.
- **Home page content from Contentful** (`home-contentful-content`): no migration.
  1. Set `CONTENTFUL_SPACE_ID` in the hosting platform's build environment as well as at runtime, with the same value.
  2. In each Contentful environment, publish one Home banner entry and the Greeting entries `about_project_home` and
     `call_to_action_signup` (see the Contentful notes at the top of this file). Until then `/` shows its static copy.
  3. In Contentful → Settings → Webhooks add Asset → Publish and Unpublish to the existing triggers.
  4. After the first deploy, look at `/` signed out, in both themes at 360, 768 and 1280 px: the hero text is
     centred and reads clearly over the photo (`docs/deferred.md`, `home-contentful-content` 3.2, while it is open).
- **Page metadata, `robots.txt` and the sitemap** (`seo-metadata`; ADR 0018): no migration.
  1. Before the deploy, check that `public/og-default.png` (the default share image, 1200×630) is in the
     repository. Every page without its own picture points at it, and a missing file shows a broken card.
  2. After the first deploy, read the real production address. If it differs from Vercel's production URL (for
     example a custom domain), set `SITE_URL` in the Vercel Production environment (build and runtime) and
     redeploy: `robots.txt` and the fixed pages read it at build time.
  3. Open the production `/robots.txt` and `/sitemap.xml` and check one poem page's `<head>` (title,
     description, canonical, `og:` and `twitter:` tags). While the site stays on its `*.vercel.app` address,
     `SITE_URL` is not set and the address comes from `VERCEL_PROJECT_PRODUCTION_URL`, so check that:
     - the `Sitemap:` line in `/robots.txt` names the same `*.vercel.app` host;
     - the sitemap's URLs and the poem page's `canonical` and `og:image` start with that host, not with
       `localhost`;
     - if any of them shows `localhost`, `VERCEL_PROJECT_PRODUCTION_URL` was not available to the build: set
       `SITE_URL` to `https://<project>.vercel.app` in the Vercel Production environment (build and runtime) and
       redeploy.
     A Preview deployment shows the production address in its canonical links; that is expected, Vercel marks
     previews `noindex`.
  4. Submit `<address>/sitemap.xml` in Google Search Console and in Yandex Webmaster (owner, manual; each service
     asks to verify the site first).
  5. Run the preview check with a real poem link in Telegram, VK and WhatsApp (`docs/deferred.md`,
     `seo-metadata` 6.5, while it is open). A messenger that shows the generic site card is a finding for
     `htmlLimitedBots` in `next.config.ts`.
- **Google sign-in** (`google-sign-in`; ADR 0019): no migration and no app variable.
  1. In Google Cloud, create the OAuth consent screen and a "Web application" OAuth client whose authorized redirect
     URI is `https://<project-ref>.supabase.co/auth/v1/callback` (the Google sign-in section above).
  2. In Supabase, Authentication → Providers → Google: enable it with that client's id and secret.
  3. In Supabase, Authentication → URL Configuration: the Site URL equals the site's address (`getSiteUrl()`), and
     Redirect URLs contain exactly `<site>/auth/callback?from=sign-in` and `<site>/auth/callback?from=sign-up`, not a
     `**` pattern. Without them the sign-in silently lands on `/` signed out.
  4. In Supabase, Authentication → Rate Limits: "token refreshes" now also counts every Google code exchange, on top
     of password sign-ins and session refreshes from the server's IP; raise it with the sign-up and sign-in limit.
  5. After the deploy, sign in with Google from `/login` and sign up from `/signup` with a real account, and check
     that both land on `/` signed in.
- **Password recovery** (`password-recovery`; ADR 0021, ADR 0022): one migration and dashboard settings, no app variable.
  1. `npx supabase db push` applies `20261125150000_password_reset_limit.sql` (the `password_reset` scope, 5 per
     minute, in `write_rate_limits` and `consume_write_allowance`). Push it **before the app**: without it
     the new-password save fails closed with the generic failure notice. Rollback: revert the app first, then the
     down migration in the file's header.
  2. In Supabase, Authentication → Emails → "Reset password": the subject and body of
     `supabase/templates/recovery.html`, with the link `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
     (the Password recovery section above). The owner confirms the Russian wording first.
  3. Check the hosted `otp_expiry` is 3600 s, the pause between letters (`max_frequency`, 60 s by default) is
     what you want, and that a custom SMTP sender is set and the email rate limit raised (Authentication →
     Rate Limits): the app answers «sent» even when the hour's cap refuses the letter.
  4. A blocked account gets nothing out of its letter (design D8). Run both checks on the hosted project:
     - The in-app run, task 6.4 of `password-recovery`: ask for a letter for a throwaway address, block that
       account on `/admin`, and follow the link: it lands on `/login?error=recovery-failed` with no form and no
       blocked wording; with a session opened before the block, `/reset-password` redirects to the same page;
       a save from a page opened before the block shows the link-expired or the generic failure notice, never
       a block wording, and the password stays unchanged. Unblock the account afterwards.
     - A direct call: with an access token from before the block, `PUT <project url>/auth/v1/user` must answer
       `403 user_banned`. Note the project's JWT signing mode (Project Settings → JWT Keys: a shared secret or
       asymmetric keys): it decides which save-time check catches a held session (design D8).
  5. After the deploy, run one real recovery on the production address: a wrong password, the offer, the letter,
     the link, a new password, then sign in with it.
- **Password policy** (`pre-deploy-security-hardening`; ADR 0028): hosted settings only, no migration. In
  Supabase, Authentication → Providers → Email (the local stack's values are in `supabase/config.toml`):
  - [ ] Minimum password length 12.
  - [ ] Required characters: lowercase and uppercase letters, digits and symbols. The app checks the same sets.
  - [ ] "Secure password change" on (`secure_password_change`): a session older than 24 hours must
        reauthenticate to change the password.
  - [ ] "Require current password" on, if the dashboard offers it. It skips recovery sessions.
  - Leaked-password protection is not available on the Free plan; turn it on if the project moves to Pro.
- Also before a first deploy: the Supabase dashboard setup and the Contentful webhook above, and the
  hosting-layer per-IP rate rule (Telegram section).
