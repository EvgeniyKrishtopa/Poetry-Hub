# Proposal

## Why

Poetry Hub's home greeting is hard-coded in `src/shared/config/site.ts`, so every copy change needs a code change and a deploy. The project is adopting Contentful as its CMS; this change lays the foundation — a server-only Contentful client, a validated data-access layer, and one real piece of content (the home greeting) flowing end to end — so later content (poems, authors, pages) can follow the same path.

## What Changes

- Add a server-only Contentful GraphQL client in `src/shared/lib/contentful/`: a typed `fetch` wrapper (no new client library) with environment/token validation and typed error mapping.
- Add a data-access layer (DAL) for the home greeting that queries Contentful, validates the response with Zod, and returns a typed domain object or a typed failure.
- Add a Contentful content type `greeting` (fields `key`, `title`, `message`) and a first entry with `key: "home"`, created manually in the Contentful web app from a recipe in `design.md`.
- Replace the home page's hard-coded heading and description with the CMS greeting, rendered in a Server Component; fall back to the current static copy when the CMS is unavailable.
- Add `src/proxy.ts` (Next.js 16's replacement for middleware) that sets baseline security headers on page responses and skips static assets.
- Add `POST /api/revalidate`, a secret-authenticated endpoint that Contentful's publish webhook calls to expire cached CMS content immediately, so a published change shows up on the next request.
- Add `.env.example` documenting the Contentful variables: secrets empty, `CONTENTFUL_ENVIRONMENT=master` as the shown default.

## Requirements

- **FR-1**: The Contentful client SHALL run only on the server; importing it from client code SHALL fail the build.
- **FR-2**: The Contentful configuration (`CONTENTFUL_SPACE_ID`, `CONTENTFUL_ACCESS_TOKEN`, optional `CONTENTFUL_ENVIRONMENT` defaulting to `master`) SHALL be validated before any request, and a missing or malformed value SHALL raise a typed configuration error that names the variable but never its value.
- **FR-3**: The client SHALL map transport failures, HTTP authentication failures (invalid or revoked token), other non-2xx responses, and GraphQL `errors` payloads to distinct typed errors.
- **FR-4**: The DAL SHALL validate every Contentful response with a Zod schema and treat a response that doesn't match as a typed validation error, never passing unvalidated data to the UI.
- **FR-5**: The DAL SHALL return the greeting whose `key` equals `"home"`, or a typed not-found result when no such entry exists.
- **FR-6**: The home page SHALL render the CMS greeting's `title` as its main heading and `message` as its description: plain text, with blank-line-separated blocks as paragraphs and single line breaks preserved; Markdown/HTML is shown literally, never interpreted.
- **FR-7**: When the greeting can't be loaded (configuration, not found, network, auth, HTTP, GraphQL, or validation failure), the home page SHALL render the existing static heading and description and log the failure on the server.
- **FR-8**: The proxy SHALL set `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, and a restrictive `Permissions-Policy` on page responses, and SHALL NOT run for `_next/static`, `_next/image`, `favicon.ico`, or any path containing a dot (so dotted page slugs are excluded too; slugs must not contain dots).
- **FR-9**: `POST /api/revalidate` SHALL expire all cached Contentful content immediately when the request's `x-contentful-webhook-secret` header matches `CONTENTFUL_REVALIDATE_SECRET` (constant-time comparison); it SHALL respond 401 on a missing or wrong secret, 503 when the secret isn't configured, and 405 for non-POST methods, expiring nothing in those cases.
- **NFR-1**: No Contentful token, webhook secret, or other secret SHALL appear in client bundles, logs, error messages, responses, or rendered HTML.
- **NFR-2**: A published greeting change SHALL be visible on the first request for `/` made more than 60 seconds after publishing (hard deadline), delivered by the publish webhook (FR-9). The deadline holds under these conditions, which are the design's accepted trade-offs: the notification is delivered and accepted, the app runs as a single instance, and Contentful's delivery API already serves the published version when the notification is processed. Greeting responses SHALL also be cached with 60-second time-based revalidation, tagged `contentful`, as a best-effort safety net for missed webhooks; that path may serve one stale response while refreshing.
- **NFR-3**: No new runtime dependency beyond `server-only`; the GraphQL client uses the platform `fetch`.

## Acceptance Criteria

- **FR-2** — Given `CONTENTFUL_ACCESS_TOKEN` is unset, When the Contentful config is loaded, Then it throws a configuration error whose message names `CONTENTFUL_ACCESS_TOKEN` and contains no secret value; and the DAL, called in the same state, returns a `config` failure instead of throwing.
- **FR-3** — Given Contentful responds with HTTP 401, When the client executes a query, Then it rejects with an authentication error, distinct from a network error or a GraphQL error.
- **FR-3** — Given Contentful responds 200 with a non-empty `errors` array, When the client executes a query, Then it rejects with a GraphQL error carrying the error messages.
- **FR-4** — Given Contentful returns a greeting item missing `title`, When the DAL parses it, Then it returns a validation failure and not a partial greeting.
- **FR-5** — Given Contentful returns an empty `items` array for `key: "home"`, When the DAL is called, Then it returns a not-found result.
- **FR-6** — Given the `home` entry is published with the title "Welcome to Poetry Hub", When a visitor opens `/`, Then the page's `h1` reads "Welcome to Poetry Hub" and the message is shown beneath it.
- **FR-7** — Given the DAL returns any failure, When a visitor opens `/`, Then the page shows the static heading "Poetry Hub" and description, and a server log entry records the failure kind.
- **FR-1** — Given a Client Component that imports the Contentful client or the home greeting DAL, When the application is built, Then the build fails with a server-only import error.
- **FR-8** — Given the application is running, When a browser requests `/`, Then the response carries all four security headers with the specified values.
- **FR-8** — Given the application is running, When a browser requests a file under `/_next/static/`, Then the proxy does not run for that request.
- **FR-9** — Given `CONTENTFUL_REVALIDATE_SECRET` is configured, When a POST to `/api/revalidate` carries a matching `x-contentful-webhook-secret`, Then it responds 200 `{ "revalidated": true }` and cached Contentful content is expired.
- **FR-9** — Given `CONTENTFUL_REVALIDATE_SECRET` is configured, When a POST to `/api/revalidate` has a missing or wrong `x-contentful-webhook-secret`, Then it responds 401 and expires nothing.
- **FR-9** — Given `CONTENTFUL_REVALIDATE_SECRET` is unset or empty, When a POST to `/api/revalidate` arrives with any header value, Then it responds 503 and expires nothing.
- **FR-9** — Given the application is running, When a GET request is sent to `/api/revalidate`, Then it responds 405 and expires nothing.
- **NFR-1** — Given the application is built with real credentials, When the client bundles in `.next/static` are searched, Then neither the access token nor the webhook secret appears; and When any Contentful failure is logged, Then the log entry contains neither.
- **NFR-3** — Given the change is complete, When `package.json` dependencies are compared with before the change, Then the only added runtime dependency is `server-only`.
- **NFR-2** — Given `/` is cached with title "Welcome to Poetry Hub" and the title is changed to "Hello, reader" and published, When the webhook notification is accepted and `/` is requested, Then that first request shows "Hello, reader".

## Capabilities

### New Capabilities
- `contentful-client`: server-only access to Contentful's GraphQL Content API — config/token validation, request execution, caching, and typed error mapping.
- `home-greeting`: the home page greeting sourced from Contentful, its validation, and its static fallback.
- `security-headers`: baseline HTTP security headers applied by the Next.js proxy to page responses.
- `content-revalidation`: the secret-authenticated webhook endpoint that expires cached Contentful content on publish.

### Modified Capabilities
<!-- none: no existing specs in openspec/specs/ -->

## Impact

- **New code**: `src/shared/lib/contentful/` (client, config, errors, webhook secret check), `src/features/home/` (DAL, Zod schema, greeting component, public `index.ts`), `src/app/api/revalidate/route.ts`, `src/proxy.ts`, `.env.example`.
- **New endpoint**: `POST /api/revalidate`, publicly reachable and secret-authenticated. This is security-relevant: it lets anyone holding the secret force cache misses, which in turn drive Contentful API calls.
- **Changed code**: `src/app/page.tsx` (renders the CMS greeting instead of `siteConfig` copy; the page moves from fully static to ISR with a 60-second revalidate); `vitest.config.mts` (alias `server-only` for tests); `CLAUDE.md` (Contentful, DAL and env conventions).
- **Dependencies**: adds `server-only`. The harness denies installs, so the user runs `npm install server-only` before implementation. Zod is already installed.
- **External systems**: Contentful space (content type `greeting` plus the `home` entry, created manually, and a webhook on Entry publish/unpublish pointing at the deployed `/api/revalidate`, configured manually); the Delivery API token and the webhook secret live in `.env.local` (never committed). Contentful can't reach `localhost`, so locally the endpoint is exercised with `curl`.
- **Build/runtime**: `next build` needs the Contentful variables present; without them the home page renders the fallback and logs a configuration error (see design for why the build doesn't fail).
