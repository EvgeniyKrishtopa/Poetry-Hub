# Environment variables

Read before adding, renaming, or reading an environment variable.

- `.env.example` (committed) lists every variable **by name only** — never put a value in it. Real values live in `.env.local` (git-ignored) and on the hosting platform.
- Contentful: `CONTENTFUL_SPACE_ID`, `CONTENTFUL_ACCESS_TOKEN` (Content Delivery API token), optional `CONTENTFUL_ENVIRONMENT` (defaults to `master`). Server-only: never prefix them with `NEXT_PUBLIC_`.
- They are validated lazily on each call; a missing or malformed value fails as a `config` error naming the variable, never its value.
- `CONTENTFUL_REVALIDATE_SECRET` gates the publish webhook `POST /api/revalidate`, which expires every Contentful-cached fetch (the `contentful` tag) immediately. Unset or empty → the endpoint fails closed with 503. Generate one with `openssl rand -hex 32`, and set the same value in `.env.local`, on the hosting platform, and in the webhook.
- Webhook setup (manual, Contentful → Settings → Webhooks; see design D10 in `openspec/changes/add-contentful-home-greeting/design.md`, or its archived copy): URL `https://<deployed-host>/api/revalidate`, method POST, triggers Entry → Publish and Unpublish, custom header `x-contentful-webhook-secret: <secret>`. Contentful can't reach `localhost`, so test locally with `curl`. To rotate, change the env var and the webhook header together.
