# 0022. A password reset signs out everywhere and ends on a redirect

## Status

Accepted (2026-11-25)

## Context

`password-recovery` (`openspec/changes/password-recovery/design.md`, D4 and D5, or its archived copy) opens a full session through a recovery link and lets the reader set a new password with `updateUser({ password })` on `/reset-password`. Two questions followed from it: which sessions the successful reset should end, and what the page shows afterwards. It builds on ADR 0003 (Supabase holds identity and the session cookies) and ADR 0007 (the `password_reset` scope, 5 per minute).

A reset usually means someone else may know the old password. A Server Action that changes the cookies also makes Next re-render the current page, and `/reset-password` reads the session on every request: once the session is gone, the page's gate redirects a signed-out request to `/login?error=recovery-failed`, so a reader who has just succeeded would see the "link expired" notice.

## Decision

1. **Global sign-out.** After `updateUser` succeeds, `updatePasswordAction` calls `signOut({ scope: "global" })`, which ends the session on every device, not only the one that opened the link. `local` would leave an attacker's session alive on another device, the very case a reset exists for.
2. **A redirect, not a state swap.** The action then calls `redirect` (outside every `try`) to `/reset-password?status=updated`. The page reads the `status` search parameter first and shows the done notice with the link to `/login` without reading any session, so the redirect target needs none. There is no `refresh()` and no in-place state swap, because both go through the same re-render and the same gate.
3. **A failed sign-out is said aloud.** When the global sign-out fails, the password is already changed, but the old sessions, and the reader's own, may live on. The action logs one name-only warning line and redirects to `?status=updated-sign-out-failed`, whose notice says the password was changed and that other sessions may still be open, instead of promising a sign-in.
4. **The done notice takes focus on load.** It is the main content of a freshly loaded page, where a live region may announce nothing (NFR-2).

## Consequences

**Positive**

- A reset closes every other session, including one opened with the old password.
- The reader who just succeeded lands on a notice that reads true, not on the link-expired one.
- The done pages need no session, so they cannot race with the sign-out.

**Negative**

- An author signed in on several devices is signed out on all of them and signs in again with the new password. The done notice says so.
- Anyone can open `/reset-password?status=updated` and read the done text. It holds nothing private and changes nothing.
- The reader's own session is gone too, so a successful reset always ends at `/login`; a "you are signed in now" experience is not offered.
- A sign-out failure leaves the old sessions to Supabase's own expiry; the app cannot close them.

## Alternatives Considered

- **`signOut({ scope: "local" })`** — rejected: other devices keep a session that may belong to whoever knew the old password.
- **Keep the reader signed in after the reset** — rejected for the same reason, and because it needs the old sessions revoked some other way.
- **Swap the form for the done notice in place, or call `refresh()`** — rejected: the cookie change re-renders the page with no session, and the gate redirects to the link-expired notice.
- **A separate "done" route** — rejected: one more page, breadcrumb row and sitemap exclusion for text that fits a search parameter on the same page.
