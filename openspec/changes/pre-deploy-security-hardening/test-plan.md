# Test Plan

One row per acceptance criterion. Scenarios of a MODIFIED requirement that did not change keep their existing tests and are listed once per requirement as "existing". Levels: unit, integration (local stack or database), end-to-end (real browser or a running server).

| Requirement | Tests | Level |
| --- | --- | --- |
| FR-1 password sign-in cookies | signed-in browser: cookie attributes, `document.cookie` holds no `sb-*` | end-to-end |
| FR-1 refresh by the proxy | session refresh writes the options on rewritten cookies | unit |
| FR-1 Google still works | manual run through Google | end-to-end |
| FR-1 production build | cookie options with `NODE_ENV` production and not; both server clients pass them | unit |
| FR-2 page response | proxy sets the four directives, no `script-src` | unit |
| FR-2 invalid configuration | proxy without a Supabase URL keeps the rest and answers | unit |
| FR-2 Google under the policy | manual run, no violation in the console | end-to-end |
| FR-3 stolen password session | action refuses; no allowance, no `updateUser` | unit |
| FR-3 recovery session | action changes the password and redirects | unit |
| FR-3 window passed | action answers link-expired for a stale entry | unit |
| password-recovery FR-4 signed in by link | real recovery link opens the form | end-to-end |
| password-recovery FR-4 password or Google session | page redirects; predicate per method | unit |
| password-recovery FR-4 too old | predicate at the window's edge; page redirects | unit |
| password-recovery FR-4 claims missing or malformed | `not-recovery`; session stays signed in | unit |
| password-recovery FR-4 signed out, blocked, check unavailable, done notice | existing | unit |
| password-recovery FR-2 captcha rejected | `captcha_failed` answers the captcha message, any address | unit |
| password-recovery FR-2 password never reaches the action | action receives address and token only | unit |
| password-recovery FR-2 other scenarios | existing, with a token added to inputs | unit |
| FR-13 password change refused | one line for a refused session, none for an unavailable check | unit |
| auth FR-4 reauthentication on | recovery on the local stack with `secure_password_change` | integration |
| auth FR-4 short password, missing kind of character | schema and messages: 11 characters, each missing kind, Cyrillic letters | unit |
| auth FR-4 existing shorter password | sign-in schema accepts 8 characters | unit |
| auth FR-2 captcha rejected | message shown, no recovery offer | unit |
| auth FR-4 sign-up captcha rejected | message shown, no account | unit |
| auth FR-2, FR-4 other scenarios | existing, with a token added to inputs | unit |
| FR-5 widget cannot run | server-rendered notice; script load failure | unit |
| FR-5 expired token | control disabled until a new token | unit |
| FR-5 no token | each auth action refuses without calling Supabase | unit |
| FR-5 rejected token | each of the three flows shows the captcha notice | unit |
| FR-5 second attempt | widget reset; recovery offer sends a new token | unit |
| FR-5 direct API call | manual: password grant, sign-up and recovery without a token against the local stack (task 4.5) | integration |
| FR-5 Google sign-in | manual: Google sign-in with captcha on; refresh checked on a password session (task 4.5; Google refresh deferred) | end-to-end |
| FR-6 dialog closed | widget not mounted until the dialog opens | unit |
| FR-6 valid token | one Telegram send | unit |
| FR-6 missing or rejected token | no send, values kept | unit |
| FR-6 verifier unavailable | no secret, network failure: no send | unit |
| FR-6 honeypot | answers sent; neither call made, with and without a token | unit |
| FR-7 enrol | enrolment by hand with an authenticator, lands on `/admin` | end-to-end |
| FR-7 wrong code | failure shown, session unchanged | unit |
| FR-7 abandoned enrolment | unverified factor removed before enrolling | unit |
| FR-7 not an admin | not-found screen | unit |
| FR-7 too many codes | sixth call refused, no verification call | unit |
| FR-7 limit scope | five allowed, sixth refused | integration |
| FR-8 password only | each admin page redirects, no admin data | unit |
| FR-8 correct code | seeded admin enters the code and sees the list | end-to-end |
| FR-8 already verified | `/admin/verify` redirects to `/admin` | unit |
| FR-8 controls at aal1 | no controls, header link shown | unit |
| admin-moderation FR-2 without the second factor | redirect to `/admin/verify` | unit |
| admin-moderation FR-2 other scenarios | existing | unit |
| home-curation FR-8 without the second factor | no add-to-home control | unit |
| home-curation FR-8 other scenarios | existing, admin at `aal2` | unit |
| FR-8 trail on `/admin/verify` | each of the three trail scenarios | unit |
| FR-9 admin function at aal1 | every `admin_*` raises 42501 | integration |
| FR-9 admin function at aal2 | existing admin tests with `aal2` claims | integration |
| FR-9 Storage delete at aal1 | policy refuses | integration |
| FR-9 is_admin at aal1 | answers true; `may_moderate_author` false | integration |
| FR-10 JPEG with GPS | re-encode drops EXIF; upload receives that body | unit |
| FR-10 GPS on the stack | stored object has no EXIF | end-to-end |
| FR-10 rotated photo | pixels upright, no orientation tag | unit |
| FR-10 trailing payload | bytes gone, type kept | unit |
| FR-10 broken file, too many pixels, output too large | failure value, nothing uploaded | unit |
| FR-11 direct upload past the cap | policy refuses at each bucket's cap | integration |
| FR-11 another author's folder | helper answers false | integration |
| FR-11 below the cap | replacement succeeds | integration |
| FR-11 refusal in the app | upload refusal maps to the save failure | unit |
| FR-11 parallel burst | measured count on the local stack | integration |
| FR-12 server error | real event from a test DSN, checked for cookies and addresses | end-to-end |
| FR-12 action throw | reported once, no message or input | unit |
| FR-12 browser URL query | scrubbing removes queries, headers, user, bodies, messages | unit |
| FR-12 not configured | no DSN, nothing sent, build passes | unit |
| FR-13 wrong password | one exact line, no address | unit |
| FR-13 captcha and rate-limit refusals | one line each for auth, contact, admin code | unit |
| FR-13 admin refusal | one line on 42501 | unit |
| FR-14 missing or extra migration | comparison fails naming it | unit |
| FR-14 unregistered hook, other settings | each mismatch fails | unit |
| FR-14 correct project | exit zero | unit |
| FR-14 seeded account | fails | unit |
| FR-14 other linked project | fails before comparing | unit |
| FR-14 no token | script exits non-zero, prints no body | integration |
| FR-14 real project | owner runs it before the deploy | end-to-end |
| FR-15 no framework header | config value; response of a production build | unit, end-to-end |
| FR-16 real account present | seed aborts, nothing inserted | integration |
| FR-16 fresh database | `db reset` loads the seed | integration |
| FR-17 pull request finding, main branch | manual check on a real pull request | end-to-end |
| FR-17 CI without secrets | workflows reference no secret | unit |
| NFR-1 | `npm run deps:audit` passes with no unused entry | integration |
| NFR-2 | log, event and script-output assertions in the FR-6, FR-7, FR-12, FR-13, FR-14 tests | unit |
| NFR-3 | secrets read only in server-only modules (boundary test); no token in the repository | unit |
| NFR-4 | pgTAP: search path and execute grants of every new function | integration |
| NFR-5 | review of the Deploy checklist and ADRs | end-to-end |
| NFR-6 | component tests by role and label; tokens-only check; look checked against the design | unit |
| NFR-7 | recorded scenarios pass with the test keys and seeded factor | end-to-end |
| NFR-8 | build output keeps the routes partially prerendered | integration |
| NFR-9 | banned-account wrong-password result recorded | integration |
