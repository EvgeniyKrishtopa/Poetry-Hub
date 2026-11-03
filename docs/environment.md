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
- **`poem-illustrations` bucket** (`add-poem-creation`): on the hosted project, confirm it exists,
  public, 5 MiB file size limit, MIME types `image/png` and `image/jpeg` — the same as
  `supabase/config.toml`, which configures the local stack only.
- **Contentful `tag` content type** (`add-poem-creation`): in each Contentful environment, a content type
  with id `tag` and fields `name` and `slug` (both short text, required), plus one published entry per
  genre. Without it the add form shows the genres-unavailable alert and poem pages show no genre line.
- Also before a first deploy: the Supabase dashboard setup and the Contentful webhook above, and the
  hosting-layer per-IP rate rule (Telegram section).
