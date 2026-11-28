# 0028. Password policy: 12 characters and composition rules

## Status

Accepted (owner, 2026-11-28)

## Context

The hosted Supabase project is on the Free plan, and leaked-password protection needs Pro. The earlier design of
`pre-deploy-security-hardening` fell back to a 12-character minimum with no character-class rule.

## Decision

A new password needs at least 12 characters with one lowercase Latin letter, one uppercase Latin letter, one digit
and one symbol from Supabase's set. The app's schema and Supabase Auth (`password_requirements =
"lower_upper_letters_digits_symbols"`) use the same sets. Sign-in checks none of it.

## Alternatives Considered

- Length only (12 characters): easier for readers, and length adds more strength than composition. Rejected by the
  owner, who wants composition checks.
- Leaked-password protection: the better check against reused passwords; not on the Free plan.
- Rules in the app only, counting any alphabet's letters: Auth's own endpoint would accept what the form refuses.

## Consequences

- A password of Cyrillic letters alone is refused, on a Russian-language site; the field message says Latin letters.
- Common patterns such as a capitalised word with a digit and `!` pass the rules; nothing checks for leaked values.
- Existing passwords keep working for sign-in; the rules apply when one is set.
- Revisit leaked-password protection if the project moves to Pro.
