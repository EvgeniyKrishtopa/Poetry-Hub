# 0024. Cloudflare Turnstile guards sign-in, sign-up, recovery and the contact form

## Status

Accepted (2026-11-28)

## Context

Every sign-in, sign-up and recovery request reaches Supabase Auth from a Server Action, so Auth's per-IP limits see
the app server's one address (ADR 0003): they cannot tell a bot from a reader. The contact form has no limit of the
app's own (ADR 0007). The plan does not buy a service for this.

## Decision

- **Cloudflare Turnstile** on the sign-in and sign-up forms, the recovery offer and the contact form. Google sign-in
  needs none: it goes through Google's own checks and Auth's PKCE grant.
- **One verifier per token.** For the auth flows Supabase Auth verifies the token (`[auth.captcha]`, `captchaToken`),
  so a call straight to Auth with the publishable key is refused too. The app only refuses a call that carries no
  token. For the contact form the action calls `siteverify` itself (`shared/lib/turnstile/`), after the honeypot.
- **Fail closed.** No token, a rejected one, a missing secret or an unreachable verifier: nothing happens. The forms'
  submit controls stay disabled until a token exists, and a token is used once.
- **A rejected captcha is said out loud, the recovery request included.** Auth checks it before it looks up any
  address, so this adds to ADR 0021's non-`sent` answers without telling whether an account exists.
- **Per-IP limits live at the hosting edge** (Vercel Firewall), not in the app.

## Alternatives Considered

- An app-level per-IP limiter: needs a trusted client address and storage that the publishable key cannot protect.
- hCaptcha, the other provider Supabase supports: the same integration, with a visible puzzle more often.
- Verifying the auth tokens in the app: a token verifies once, so Auth could no longer check it, and a direct call to
  Auth would stay open.

## Consequences

- A Cloudflare outage blocks sign-in, sign-up, recovery and contact. The way out for the auth forms is turning Auth
  captcha off in the dashboard; the forms still ask for a token, so a widget that cannot run still blocks them.
- Visitors' data reaches Cloudflare on `/login`, `/signup` and an open contact dialog; the privacy policy names it.
- A direct Auth call, a script included, needs a token: local tools use Cloudflare's published test keys.
- With the captcha in front, the shared per-IP limits in Auth can be raised (docs/environment.md).
- The captcha stops automated calls, not a person or a paid solving service; the Firewall rules bound the rate.
