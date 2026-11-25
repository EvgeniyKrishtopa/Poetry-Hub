# 0021. The recovery answer never depends on the address

## Status

Accepted (2026-11-25)

## Context

`password-recovery` (`openspec/changes/password-recovery/design.md`, D2, D3, D8 and D10, or its archived copy) lets a signed-out reader ask for a letter that opens a new-password form. The person asking is not known, so anyone can type any address. It builds on ADR 0003 (Supabase holds identity and mail), ADR 0007 (write limits in Postgres), ADR 0019 (Google sign-in) and ADR 0020 (the Google path may tell a blocked address). admin-moderation FR-16 and FR-17 already make sign-in and sign-up answer the same for every address, so recovery must not become the one screen that tells a stranger which addresses have an account, how they were registered, or that they are blocked.

Supabase does not help here by itself. Recorded on the local stack on 2026-11-25 (task 1.1, with the pause between letters set to the hosted 60 s):

- a known address: the first request is `200` and a letter arrives, the second inside the pause is `429` with `over_email_send_rate_limit`;
- an unknown address: both requests are `200` and no letter is sent, so only the per-address refusal tells the two apart;
- a blocked address answers exactly as a known one (a letter, then the same refusal);
- the first request for a known address answers three to four times slower than for an unknown one (66, 20, 24, 14 ms against 7, 8, 4, 5 ms), because only it sends mail.

## Decision

1. **The offer after any wrong-credentials failure.** The recovery offer appears after every wrong-credentials failure on `/login`, never after a lookup of the address. A visitor who typed an unknown address sees the same offer as one who typed a known address with a wrong password.
2. **The per-address refusal is swallowed.** `requestRecoveryAction` answers `sent` for every outcome except an invalid address shape, the IP-wide limit (`over_request_rate_limit` or a bare 429), missing configuration and an unlisted failure. `over_email_send_rate_limit` is answered `sent` and logged by name only. When an error carries a code, the code alone decides (`classifyRecoveryRequestError`): that code also arrives with HTTP 429, so a status check first would show the known-address answer.
3. **A static Google hint instead of per-address notices.** A reader who registered with Google is told by one line under the Google button on `/login` and `/signup`, shown to every visitor. A notice such as "this address is tied to Google" would need a database function over `auth.users` that anyone could call (owner, 2026-11-25).
4. **The timing difference is accepted.** The response is not padded. Sign-in has the same channel today, padding is speculative work (YAGNI), and a stranger still learns nothing from the page itself. The numbers above are the measurement.
5. **The letter still goes to a blocked address.** The guarantee is that a blocked or banned account has no access to a recovery link or to a password change (owner, 2026-11-25), not that no letter is sent. Not sending it would need either a `send_email` Auth hook, which replaces the sending of every Auth letter (sign-up included) with the app's own sender, or a lookup of the address's block state before the request, which any visitor could use to find blocked accounts and which would break point 2. Both were rejected. The letter is harmless because every way to use it is closed, each recorded on the local stack:
   - the link, also one issued before the block: `verifyOtp` answers `403 user_banned`, no session opens, and the route shows the same `recovery-failed` notice as for an expired link;
   - a session or token issued before the block: Supabase's own `PUT /auth/v1/user` and `GET /auth/v1/user` answer `403 user_banned` and a refresh `400 user_banned`;
   - through the app, `/reset-password` asks the caller's own `is_restricted()` after the session read and redirects a restricted caller as a signed-out one, and `updatePasswordAction` fails on the session check or on `consume_write_allowance` (`assert_not_restricted()`) before `updateUser` runs, with a generic notice that never mentions a block.

## Consequences

**Positive**

- No step of the flow tells a stranger whether an address has an account, how it signs in, or that it is blocked.
- Sign-in, sign-up and recovery keep one rule: the answer depends on what was typed into the form, never on who the address belongs to.
- A blocked account can neither open a recovery link nor change its password, without a custom Auth hook.

**Negative**

- A reader who types an address that has no account is told the letter was sent and waits for nothing. The notice is neutral and names the link's one-hour lifetime, and the offer's button stays so the reader can ask again.
- A letter may be "sent" and never arrive when the hosted letter cap or the sender fails; the operator sees only a name-only log line for the swallowed per-address refusal. The Deploy checklist asks for a custom sender and a raised cap.
- The response time still tells a known address from an unknown one, by a few tens of milliseconds, to someone who measures it.
- The answer depends on Supabase's code for a refused second letter. If it renames the code, the classifier falls back to `unknown`, which reveals nothing, but the reader then sees a failure for a repeat request; the recording in task 1.1 is the check to repeat after an upgrade.
- A blocked account still receives a letter it cannot use. Setting only `banned_until` without the restriction row would leave the app's own guards open, so the guarantee rests on every admin block writing the row (ADR 0015).

## Alternatives Considered

- **"Too many attempts" for the per-address refusal** — rejected: the refusal happens only for an address with an account, so the text would let anyone probe addresses.
- **A per-address notice for a Google-only account** — rejected by the owner: it needs a callable function over `auth.users` and tells a stranger how an address signs in.
- **Padding the response to a fixed time** — rejected for now: the same timing channel exists on sign-in and nobody has asked for it to be closed.
- **A `send_email` Auth hook that skips blocked addresses** — rejected: it takes over the sending of every Auth letter, sign-up included.
- **Looking up the address's block state before the request** — rejected: any visitor could use it to find blocked accounts, which breaks point 2.
