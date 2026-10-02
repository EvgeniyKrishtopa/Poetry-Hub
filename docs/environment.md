# Environment variables

Read before adding, renaming, or reading an environment variable.

- `.env.example` (committed) lists every variable **by name only** — never put a value in it. Real values live in `.env.local` (git-ignored) and on the hosting platform.
- Contentful: `CONTENTFUL_SPACE_ID`, `CONTENTFUL_ACCESS_TOKEN` (Content Delivery API token), optional `CONTENTFUL_ENVIRONMENT` (defaults to `master`). Server-only: never prefix them with `NEXT_PUBLIC_`.
- They are validated lazily on each call; a missing or malformed value fails as a `config` error naming the variable, never its value.
- `CONTENTFUL_REVALIDATE_SECRET` gates the publish webhook `POST /api/revalidate`, which expires every Contentful-cached fetch (the `contentful` tag) immediately. Unset or empty → the endpoint fails closed with 503. Generate one with `openssl rand -hex 32`, and set the same value in `.env.local`, on the hosting platform, and in the webhook.
- Webhook setup (manual, Contentful → Settings → Webhooks; see design D10 in `openspec/changes/add-contentful-home-greeting/design.md`, or its archived copy): URL `https://<deployed-host>/api/revalidate`, method POST, triggers Entry → Publish and Unpublish, custom header `x-contentful-webhook-secret: <secret>`. Contentful can't reach `localhost`, so test locally with `curl`. To rotate, change the env var and the webhook header together.
- Supabase: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the `sb_publishable_…` key). They are public by design: the browser client reads them too, so they carry the `NEXT_PUBLIC_` prefix and are read as literal `process.env.NEXT_PUBLIC_…` accesses (Next inlines nothing else into the browser bundle).
  - Only the publishable key is ever used. Never add a secret or service-role key; nothing in `src/` may read one.
  - URL rule: `https://` with any host, or `http://` only for `localhost` / `127.0.0.1` (a local Supabase CLI instance).
  - Validated lazily on each client creation by `getSupabaseConfig()` in `src/shared/lib/supabase/config.ts`; a bad value raises `SupabaseConfigError` naming the variable, never its value.
- Supabase dashboard setup (manual; see the Migration Plan in `openspec/changes/add-supabase-auth/design.md`, or its archived copy):
  1. Authentication → URL Configuration: Site URL `http://localhost:3000` for dev (the deployed URL at deploy time); add both to Redirect URLs.
  2. Authentication → Emails → "Confirm sign up": the link `href` becomes `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
  3. Authentication → Providers → Email: "Confirm email" on; minimum password length 8.
  4. Authentication → Rate Limits: raise "sign-ups and sign-ins" above the default 30 per 5 minutes. Every sign-in and sign-up runs in a Server Action, so they all reach Supabase from the server's IP and share one per-IP budget; forwarding each reader's IP would need a secret key, which this project does not use.
