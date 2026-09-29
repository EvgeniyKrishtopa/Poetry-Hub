# Tasks

## 1. Manual prerequisites (user) <!-- judgement-heavy -->

- [x] 1.1 (FR-1, NFR-3) User runs `npm install server-only` (the harness denies agent installs); verify `server-only` appears in `package.json` dependencies and `package-lock.json` is updated
- [x] 1.2 (FR-5) User creates the `greeting` content type and publishes the `home` entry per design D7; verify in Contentful's GraphiQL that the `HomeGreeting` query returns one item with the expected title

## 2. Test and env setup <!-- isolated -->

- [x] 2.1 (FR-1) Add a `server-only` alias in `vitest.config.mts` pointing to an empty stub module; verify with a throwaway import in a test that `npm run test` still passes
- [x] 2.2 (FR-2, NFR-1) Add `.env.example` with `CONTENTFUL_SPACE_ID=` and `CONTENTFUL_ACCESS_TOKEN=` (empty) and `CONTENTFUL_ENVIRONMENT=master` (the only variable with a value, showing the default), and a `!.env.example` exception in `.gitignore`; verify `git check-ignore .env.example` prints nothing and `git check-ignore .env.local` still matches

## 3. Contentful client (`src/shared/lib/contentful/`) <!-- judgement-heavy -->

- [x] 3.1 (FR-3, NFR-1) Implement `errors.ts`: `ContentfulError` with `kind` in `config | network | auth | graphql | http`, and `ContentfulErrorKind`; verify with unit tests that each kind is constructible and that messages never include values passed as secrets
- [x] 3.2 (FR-2) Implement `config.ts` (`getContentfulConfig`, Zod over `process.env`, lazy, throws `ContentfulError` with `kind: "config"`; `environment`: unset or empty → `master`, non-empty must match `^[a-zA-Z0-9_.-]+$`); verify with unit tests using `vi.stubEnv`: missing token, malformed space ID (error names the variable and contains neither value), unset and empty environment → `master`, and a malformed environment → config error naming it without its value
- [x] 3.3 (FR-1, FR-3, NFR-1, NFR-2) Implement `client.ts` (`contentfulQuery`: POST to the environment endpoint, bearer auth, 5 s timeout, optional `cache` argument (`revalidate` defaults to 60; tags = the caller's tags plus `CONTENTFUL_CACHE_TAG`, de-duplicated), Zod-parsed envelope, error mapping in order network → auth → graphql → http); verify with unit tests over a stubbed `fetch` for request URL/headers/body, cache options (no argument → 60 s + `["contentful"]`; `{ revalidate: 300, tags: ["poems"] }` → 300 s + `["poems", "contentful"]`; a caller passing `["contentful"]` gets no duplicate), 401, 403, `errors[]` with 400 and with 200, 500, a non-JSON body, a 200 with `{}` and with `{ "data": null }` (both → `http` with status 200), a rejected fetch, and a 200 success returning `data`
- [x] 3.4 (FR-1, NFR-2) Add `index.ts` exporting `contentfulQuery`, `ContentfulError`, `ContentfulErrorKind`, `CONTENTFUL_CACHE_TAG`; every module in the folder starts with `import "server-only"`; verify `npm run typecheck` and `npm run lint` pass
- [x] 3.5 (FR-1, FR-2, NFR-1) Document in CLAUDE.md: `shared/lib/contentful` in the structure tree, the "infrastructure clients may live in `shared/lib` from their first consumer" exception, and an env-var section pointing at `.env.example` (names only, never values); verify CLAUDE.md stays under 200 lines

## 4. Home greeting feature (`src/features/home/`) <!-- judgement-heavy -->

- [x] 4.1 (FR-4) Implement `model/greeting.schema.ts` (Zod for the `greetingCollection` response, each field `z.string().trim().min(1)`, and `Greeting` via `z.infer`) and `model/greeting.types.ts` (`GreetingResult`, `reason: ContentfulErrorKind | "validation" | "not-found"`, type-only imports); verify with unit tests that a valid payload parses with surrounding whitespace trimmed, and that a missing `title`, an empty string, a whitespace-only string, or a missing collection each fail
- [x] 4.2 (FR-3, FR-4, FR-5, FR-7, NFR-1, NFR-2) Implement `dal/home-greeting.ts` (`getHomeGreeting`: query with `key: "home"`, relying on the client's cache defaults, `safeParse`, empty items → `not-found`, `ContentfulError` → failure result, other errors re-thrown, exactly one `console.error("[contentful] home greeting failed", { reason, status? })` per failure, where `status` is present only for `auth`/`http`, and no payloads); verify with unit tests mocking `contentfulQuery`: success, not-found, validation, each error kind → reason, a non-Contentful error re-thrown, and a log spy asserting the exact log shape and that the token string never appears
- [x] 4.3 (FR-6, FR-7) Implement `model/resolve-greeting.ts` returning `GreetingContent` (success → the CMS greeting's `{ title, message }`, any failure → `{ title: siteConfig.name, message: siteConfig.description }`); verify with unit tests for success and for a failure
- [x] 4.4 (FR-6) Implement `components/HomeGreeting/HomeGreeting.tsx` (synchronous; `h1` title; message split on blank lines into one `<p>` per block with `whitespace-pre-line` so single line breaks show; plain text only, no Markdown/HTML interpretation; Tailwind only unless custom styling is needed); verify with Testing Library tests that the heading renders, that "Line one\nLine two\n\nSecond paragraph" yields two paragraphs, and that "**Bold** <b>tag</b>" renders literally with no `<b>`/`<strong>` element
- [x] 4.5 (FR-1) Add `features/home/index.ts` exporting `getHomeGreeting`, `resolveGreeting`, `HomeGreeting`; verify `npm run lint` passes (public-API rule) and coverage stays ≥ 80%
- [x] 4.6 (FR-1, FR-4) Document in CLAUDE.md's state-management and naming sections the DAL rule (server-only data consumed only by Server Components → a module in the feature's `dal/` folder with `import "server-only"`, validated with Zod, never `queryOptions`) and the `dal/` folder (no role suffix); verify CLAUDE.md stays under 200 lines

## 5. Home page wiring (`src/app/page.tsx`) <!-- isolated -->

- [x] 5.1 (FR-6, FR-7, NFR-2) Update `page.tsx`: await `getHomeGreeting()`, pass `resolveGreeting(result)` to `HomeGreeting` in place of the `siteConfig` heading/description, export `revalidate = 60`, keep the poems prefetch unchanged; verify `npm run typecheck` passes and `npm run build` shows `/` as revalidated (ISR, 1m) instead of static

## 6. Security headers proxy (`src/proxy.ts`) <!-- judgement-heavy -->

- [x] 6.1 (FR-8) Implement `src/proxy.ts` (exported `SECURITY_HEADERS` constant, `proxy` returning `NextResponse.next()` with them, `config.matcher` = `/((?!_next/static|_next/image|favicon.ico|.*\..*).*)`); verify with a unit test (node environment) that the response carries all four headers with exact values, and a matcher test that `/` and `/poems/some-poem` match while `/_next/static/x.js`, `/_next/image`, `/favicon.ico`, `/robots.txt`, and `/poems/mr.smith` don't

## 7. Publish webhook (`POST /api/revalidate`) <!-- judgement-heavy -->

- [x] 7.1 (FR-9, NFR-1) Implement `shared/lib/contentful/webhook.ts` (`verifyWebhookSecret`: lazy env read; unset or empty → `not-configured`; SHA-256 + `timingSafeEqual` → `ok` or `unauthorized`; `import "server-only"`) and export it from `index.ts`; verify with unit tests using `vi.stubEnv`: match → `ok`, wrong value, missing header, a different-length value → `unauthorized`, unset secret and empty secret with an empty header → `not-configured`
- [x] 7.2 (FR-9, NFR-1, NFR-2) Implement `src/app/api/revalidate/route.ts` exporting only `POST`: `ok` → `revalidateTag(CONTENTFUL_CACHE_TAG, { expire: 0 })` + 200 `{ revalidated: true }`; `unauthorized` → 401; `not-configured` → 503 + server log; verify with unit tests (node environment, `next/cache` mocked) that `revalidateTag` is called exactly once with `("contentful", { expire: 0 })` only on `ok`, and that no response body or log call contains the secret
- [x] 7.3 (FR-9, NFR-1) Add `CONTENTFUL_REVALIDATE_SECRET=` (empty) to `.env.example`, and document in CLAUDE.md the webhook endpoint and its manual Contentful setup (link to design D10); verify the `.env.example` line exists and CLAUDE.md stays under 200 lines

## 8. Automated verification <!-- isolated -->

- [x] 8.1 (FR-1) Verify the server-only guard: temporarily add a Client Component (`"use client"`) that imports `@/features/home`, run `npm run build`, and confirm it fails with a server-only import error; then remove the temporary file and confirm `npm run build` passes again
- [x] 8.2 (FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, NFR-1, NFR-2, NFR-3) Run `npm run typecheck && npm run lint && npm run test:coverage && npm run build`; verify all pass with coverage ≥ 80% on statements, lines, and functions, and that `package.json` gained no runtime dependency other than `server-only`

## 9. Manual integration verification (real credentials) <!-- judgement-heavy -->

- [x] 9.1 (FR-6, NFR-1) With real credentials in `.env.local`, run `npm run build && npm run start`; verify `/` renders the CMS greeting (the published `home` entry's title as the `h1` and its message), not the static `siteConfig` fallback, and that the built client JS in `.next/static` contains neither the access token, nor the `CONTENTFUL_REVALIDATE_SECRET` value, nor `graphql.contentful.com`
- [x] 9.2 (NFR-2) Verify the home page is cached: with the production server running, `curl -sI http://localhost:3000/` twice within 60 s and confirm the second response carries `x-nextjs-cache: HIT`. This checks page-level caching only (the second load never calls `fetch`), not whether the fetch-level Data Cache holds the authenticated POST. It passes on this result alone, and `client.ts` stays POST
- [x] 9.3 (FR-7, NFR-2) Temporarily set an invalid `CONTENTFUL_ACCESS_TOKEN`, rebuild and start; verify `/` shows the static heading "Poetry Hub", the poem list still renders, and the server log shows `reason: "auth"` without the token. Then restore the real token **without rebuilding**, restart `npm run start`, wait more than 60 s, and request `/` twice; verify the second request shows the CMS greeting (the NFR-2 safety-net recovery scenario)
- [x] 9.4 (FR-8) With the server running, verify `curl -sI http://localhost:3000/` shows all four security headers, and that a `/_next/static/...` asset response doesn't include `X-Frame-Options`
- [ ] 9.5 (FR-9, NFR-2) With the production server running and `CONTENTFUL_REVALIDATE_SECRET` set: load `/`, change and publish the `home` title in Contentful, then `curl -X POST -H "x-contentful-webhook-secret: <secret>" http://localhost:3000/api/revalidate`; verify a 200 `{"revalidated":true}` and that the very next load of `/` shows the new title. Then verify a wrong secret returns 401, `curl -X GET` returns 405, and, restarting without the secret, a POST returns 503. Restore the title afterwards <!-- blocked: live publish step unverified — after a Contentful publish, the Delivery API still served the old entry (publishedAt 2026-09-28, v10), so "next load shows the new title" couldn't be observed; user skipped. Verified in the same run: correct secret → 200 {"revalidated":true}, wrong/missing secret → 401, GET → 405, secret unset → 503 + log. -->
