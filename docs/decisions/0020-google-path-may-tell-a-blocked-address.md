# 0020. The Google path may tell the address's owner that it is blocked

## Status

Accepted (2026-11-24)

## Context

admin-moderation FR-17 (ADR 0015) hides a ban from the password sign-up: a banned address gets the same "check your email" answer as any other, because anyone can type any address into that form, and a different answer would tell a stranger that the address is banned.

`google-sign-in` (`openspec/changes/google-sign-in/design.md`, D8, or its archived copy) reaches the same moderation from another side. A banned address that signs up with Google is refused by the same Before User Created hook, and a blocked existing account that signs in with Google is refused by Supabase as `user_banned`. Both refusals come back to `/auth/callback` (recorded on the local stack, task 1.2). The question was what the page should then say.

## Decision

On the Google path, a refusal for a block or a ban shows the blocked notice (`GOOGLE_BLOCKED_MESSAGE`: sign-in with this address is not possible) on the page the visitor started from (`/login?error=google-blocked` or `/signup?error=google-blocked`). The text says that the address cannot be used, never why. The password sign-up keeps FR-17 unchanged.

The exception is safe because of who sees it. Before Supabase hands the refusal back, the visitor has just proved to Google that they own the address, so the answer reaches only the address's owner, who already knows of the block from the admin's email (ADR 0016). A stranger cannot use the Google path to probe someone else's address.

## Consequences

**Positive**

- A blocked person who tries Google gets an honest answer instead of a vague failure, and stops retrying.
- The password sign-up's protection against probing an address is untouched.

**Negative**

- The two paths answer the same banned address differently. Anyone who changes either one must keep this split: the Google wording must not appear on the password path.
- The answer depends on Supabase reporting a ban as a recognisable refusal (`user_banned`, or the hook's `signup not allowed`). If Supabase changes those values, the classifier falls back to the generic failed notice (`GOOGLE_FAILED_MESSAGE`), which reveals nothing.

## Alternatives Considered

- **The same failed text for a ban as for any other failure** — rejected by the owner: the visitor would retry for nothing, and hiding the block protects no third party on this path.
- **Explaining the reason (blocked by the admin, banned)** — rejected: the page has no reason to say more than that the address cannot be used, and the admin's email already explains it.
