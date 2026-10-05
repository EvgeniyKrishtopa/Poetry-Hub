# 0003. Supabase holds identity and user content; credentials go through Server Actions

## Status

Accepted (2026-10-03)

## Context

Poetry Hub will let readers keep their own content, starting with poems. Contentful already serves editorial content (the home greeting, and later pages such as about and FAQ), but it is an editorial CMS: it has no per-reader identity and is not meant for content that readers write. Every write to reader content needs to know who the reader is, so `add-supabase-auth` adds identity first, before any reader table exists.

The change also had to decide how credentials move, how the signed-in state reaches the UI without breaking `/`'s shared cache (Cache Components), and how to live with Supabase Auth's per-IP rate limit when every call comes from the Next server.

## Decision

- **Content split.** Contentful holds editorial pages. Supabase holds identity (Supabase Auth, email and password) and, from the poems change onward, reader-editable content. The Supabase clients live in `shared/lib/supabase`, following the `shared/lib/contentful` precedent for external-service clients.
- **Credentials through Server Actions.** Sign-in, sign-up, and sign-out are Server Actions built with `next-safe-action` (`features/auth/actions/`). The Zod schema is enforced on the server, which is the trust boundary. One action client centralises the error policy: an unexpected error becomes a generic message, and only the error's `name` is logged, never the input. The forms use React's `useActionState`, not `useAction`, because `useAction` keeps the last input, including the password, in hook state.
- **Session freshness and the header.** The proxy refreshes the session on every matched request and is the only token refresher (the browser client runs with `autoRefreshToken: false`). The header's `AuthStatus` reads the session only in the browser, through a TanStack query, and re-reads it on every pathname change. The server render stays identical for every reader, so `/` keeps its static, shared-cache rendering mode.
- **Publishable key only, with a raised rate limit (user decision 2026-10-02).** Supabase rate-limits sign-ups and sign-ins per IP. Because every call now comes from the server's IP, all readers share one budget. Forwarding the reader's IP is honoured only with a secret key, which the project rules out for now. So the app keeps the publishable key, and the "sign-ups and sign-ins" limit is raised in the Supabase dashboard.

## Consequences

**Positive**

- Credentials never reach a client-side Supabase call; input validation can't be bypassed.
- One place defines the auth error policy and the password-handling guarantees.
- `/` stays cached and identical for every reader.
- A future feature reads "who is signed in" from the same `["auth","session"]` query.

**Negative**

- **Shared rate-limit budget.** One abuser can exhaust the sign-in/sign-up budget for everyone. **Revisit before real public traffic**: consider a secret-key, auth-only server client that forwards the reader's IP (`Sb-Forwarded-For`).
- **Session cookies are readable by JavaScript** (how `@supabase/ssr` works, and the header relies on it), so an XSS bug could exfiltrate a session. Today's mitigation is React escaping, no `dangerouslySetInnerHTML`, and no third-party scripts. **Follow-up: add a Content Security Policy** (out of scope for `add-supabase-auth`).
- The header syncs on navigation. A future auth flow that ends on the same pathname must refresh the widget explicitly.
- Email confirmation depends on manual dashboard settings ("Confirm email" on, the confirm-link template), which can drift from the code.

## Alternatives Considered

- **Call Supabase Auth from the browser client.** The first draft of the design did this. Rejected by the user: the server should own every credential flow and validate input where it can't be bypassed.
- **Hand-written Server Actions without `next-safe-action`.** Rejected: each action would repeat the validation, result-typing, and error-masking plumbing that the library centralises.
- **A secret key with IP forwarding, now.** Rejected for the first release: a secret key in the server is a bigger blast radius than the shared rate-limit budget at today's traffic. Kept as the revisit path above.
- **Supabase for editorial content too, retiring Contentful.** Rejected: Contentful already serves editors and the webhook-driven cache; only reader-owned data needs Supabase.
