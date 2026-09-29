# Test Plan

One row per acceptance-criterion outcome (a **Then**) in `proposal.md`. Levels:
- **unit**: one module in isolation, with collaborators stubbed (for example `fetch`, `contentfulQuery`, `next/cache`).
- **integration**: several real modules together, or the build toolchain, with only the network and framework cache stubbed.
- **end-to-end**: the built app running (`next build && next start`), driven over HTTP or in a browser.

| Requirement | Tests | Level |
|---|---|---|
| FR-2 (config throws, names the variable, leaks no value) | Config loader with `CONTENTFUL_ACCESS_TOKEN` unset throws a `config` error whose message names `CONTENTFUL_ACCESS_TOKEN`; with a malformed space ID and a known token set, the message contains neither value | unit |
| FR-2 (DAL returns a `config` failure instead of throwing) | `getHomeGreeting()` with the real config loader and client, the token env unset: resolves `{ ok: false, reason: "config" }`, does not throw, and `fetch` is never called | integration |
| FR-3 (401 → authentication error, distinct from network/GraphQL) | Client with stubbed `fetch` returning 401 rejects with `kind: "auth"`; the same suite shows a rejected fetch → `network` and an `errors[]` body → `graphql` | unit |
| FR-3 (200 with non-empty `errors` → GraphQL error with messages) | Client with stubbed `fetch` returning 200 + `errors: [{ message: "x" }]` rejects with `kind: "graphql"` carrying `"x"` | unit |
| FR-4 (item missing `title` → validation failure, no partial greeting) | DAL with `contentfulQuery` mocked to return an item without `title` resolves `{ ok: false, reason: "validation" }` with no greeting field; the schema test also rejects whitespace-only and empty strings | unit |
| FR-5 (empty `items` → not-found) | DAL with `contentfulQuery` mocked to return `items: []` resolves `{ ok: false, reason: "not-found" }` | unit |
| FR-6 (`h1` is the CMS title, message beneath it) | `HomeGreeting` renders the title as the level-1 heading and the message paragraphs after it (including the multi-paragraph and literal-markup cases) | unit |
| FR-6 (`h1` is the CMS title, message beneath it) | The built app with real credentials: `/` shows the `h1` "Welcome to Poetry Hub" with the CMS message (task 9.1) | end-to-end |
| FR-7 (static heading and description shown on any failure) | `resolveGreeting` maps every failure reason to `{ title: siteConfig.name, message: siteConfig.description }`; `HomeGreeting` given that value shows "Poetry Hub" as the `h1` | unit |
| FR-7 (static heading and description shown on any failure) | The built app with an invalid token: `/` shows "Poetry Hub" and the poem list still renders (task 9.3) | end-to-end |
| FR-7 (server log records the failure kind) | DAL with a `console.error` spy: each failure logs exactly once as `("[contentful] home greeting failed", { reason, status? })` with the matching reason | unit |
| FR-1 (client import of the Contentful client or DAL fails the build) | A temporary `"use client"` component importing `@/features/home` makes `next build` fail with a server-only import error; after removing it, the build passes (task 8.1) | integration |
| FR-8 (`/` response carries all four headers with exact values) | `proxy()` called with a request for `/` returns a response with exactly the four `SECURITY_HEADERS` values | unit |
| FR-8 (`/` response carries all four headers with exact values) | Against the running app, `curl -sI /` shows all four headers (task 9.4) | end-to-end |
| FR-8 (proxy does not run for `/_next/static/…`) | The exported `config.matcher` pattern matches `/` and `/poems/some-poem` and does not match `/_next/static/x.js`, `/_next/image`, `/favicon.ico`, `/robots.txt`, `/poems/mr.smith` | unit |
| FR-8 (proxy does not run for `/_next/static/…`) | Against the running app, a `/_next/static/…` asset response has no `X-Frame-Options` (task 9.4) | end-to-end |
| FR-9 (matching secret → 200 `{ revalidated: true }` and content expired) | The `POST` route handler with the real `verifyWebhookSecret` and `next/cache` mocked: a matching header returns 200 `{ revalidated: true }` and calls `revalidateTag("contentful", { expire: 0 })` exactly once | integration |
| FR-9 (missing/wrong secret → 401, nothing expired) | Same setup: a missing header, a wrong value, and a different-length value each return 401 and `revalidateTag` is not called | integration |
| FR-9 (secret unset or empty → 503, nothing expired) | Same setup with the secret unset, and with it empty plus an empty header: 503, a server log entry, and `revalidateTag` is not called | integration |
| FR-9 (GET → 405, nothing expired) | The route module exports `POST` and no other method handler | unit |
| FR-9 (GET → 405, nothing expired) | Against the running app, `curl -X GET /api/revalidate` returns 405 (task 9.5) | end-to-end |
| NFR-1 (client bundles contain neither the token nor the webhook secret) | After `next build` with real credentials, searching `.next/static` finds neither the access token, the webhook secret value, nor `graphql.contentful.com` (task 9.1) | end-to-end |
| NFR-1 (logged failures contain neither secret) | DAL log spy: no logged argument contains the token string. Route handler log and response spies: neither contains the webhook secret. Config error messages contain no configured value | unit |
| NFR-3 (only `server-only` and `zod` added as runtime dependencies) | Comparing `package.json` `dependencies` with the base branch shows `server-only` and `zod` (promoted from transitive) as the only additions (task 8.2) | integration |
| NFR-2 (first request after an accepted webhook shows the new title) | Against the running app, publish a new title, POST the webhook with the secret, and the very next `/` request shows the new title (task 9.5) | end-to-end |
