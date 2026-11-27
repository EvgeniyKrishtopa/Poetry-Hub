# 0023. A baseline Content-Security-Policy, without `script-src` for now

## Status

Accepted (2026-11-27)

## Context

The OWASP review before the first deploy found no `Content-Security-Policy` and auth cookies readable by page scripts (`openspec/changes/pre-deploy-security-hardening/design.md`, D1 and D2, or its archived copy). A `script-src` that actually stops injected scripts needs a per-request nonce or hashes. A nonce makes every page render per request, which gives up the partially prerendered public pages (Cache Components). Turnstile and Sentry, added by the same change, would also each need an allowance in a stricter policy.

## Decision

1. `src/proxy.ts` sends, with the other security headers: `object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self' <Supabase origin> https://accounts.google.com`.
2. No `script-src`, `default-src`, `connect-src` or `frame-src`. A strict script policy is post-deploy work (`docs/security-post-deploy.md`).
3. The policy is built in the proxy, next to the other security headers, not in `next.config.ts`. On an invalid Supabase configuration it omits only that origin.
4. Script injection is limited meanwhile by the auth cookies being `HttpOnly`: an injected script cannot read the session, though it can still act within the open page.

## Consequences

**Positive**

- Plugins, `<base>` rewriting, framing, and form posts to other origins are blocked at no rendering cost.
- Pages stay partially prerendered.

**Negative**

- The policy does not stop an injected script from running.
- Chrome applies `form-action` to the redirects after a form post. A new sign-in provider, or a provider that redirects through another origin, must be added to the list, or the redirect is blocked.
- Requests the proxy's matcher skips (static assets and paths with a dot) carry no policy.

## Alternatives Considered

- **A nonce-based `script-src` now** — rejected: it makes the public pages render per request.
- **`script-src` with `'unsafe-inline'`** — rejected: it stops little and looks like protection.
- **`headers()` in `next.config.ts`** — rejected: a second place for security headers, and no way to omit the Supabase origin per request.
