| Requirement | Test(s) that close it | Level |
| --- | --- | --- |
| auth FR-1 · sign-in page renders | Existing `/login` page test still passes: email, password, «Войти» and the `/signup` link | unit |
| auth FR-1 · Google button on the sign-in page | `/login` page test: an enabled «Войти через Google» button renders below the form's «Войти» button; recorded browser scenario: the button shows on `/login` | unit, end-to-end |
| auth FR-3 · sign-up page renders | Existing `/signup` page test still passes | unit |
| auth FR-3 · Google button on the sign-up page | `/signup` page test: an enabled «Зарегистрироваться через Google» button below the form's «Зарегистрироваться» button; recorded browser scenario | unit, end-to-end |
| auth FR-3 · unknown error value | `getGoogleErrorMessage` test: any other value gives none; `GoogleSignInPanel` test: `/signup?error=anything-else` renders no alert | unit |
| auth FR-5 · valid link, invalid link, no open redirect | Existing `/auth/confirm` route tests still pass unchanged | unit |
| auth FR-5 · confirm-failed message | Existing `/login?error=confirm-failed` test still passes, and the alert is inside the password form, not the Google slot | unit |
| auth FR-5 · Google notice on the sign-in page | `GoogleSignInPanel` test: `google-failed` on `/login` gives the failed text in a `role="alert"` above the button; recorded browser scenario: `/login?error=google-blocked` shows its notice | unit, end-to-end |
| FR-G1 · button starts the flow | `startGoogleSignInAction` test (Supabase server client mocked): `signInWithOAuth` called with provider `google` and `redirectTo` `<site>/auth/callback?from=sign-in`, then `redirect` with the returned address | unit |
| FR-G1 · sign-up page remembers its origin | Same action test with `from=sign-up`: `redirectTo` ends `?from=sign-up`; an invalid `from` is rejected before any Supabase call | unit |
| FR-G1 · start fails | Action test: an Auth error, a missing config and no URL each return the failed result and no redirect; `GoogleSignInButton` test: the failed result shows the try-again alert and the button is enabled | unit |
| FR-G1 · retry from a page with a notice | `GoogleSignInButton` test: with `initialError` set to the cancelled text, a failed start leaves exactly one alert, reading the failed text | unit |
| FR-G1 · pending | `GoogleSignInButton` test: while the action is pending the button is disabled and `aria-busy` | unit |
| FR-G2 · offline | `GoogleSignInButton` test with the connection hook reporting offline: button disabled, connection notice above it, pressing starts nothing; recorded browser scenario in offline mode | unit, end-to-end |
| FR-G2 · slow connection | `GoogleSignInButton` test with `slow`: button disabled, slow-connection notice | unit |
| FR-G2 · back online | `GoogleSignInButton` test: status changes from offline to online, the notice disappears and the button is enabled | unit |
| FR-G3 · new account through sign-up | `finishGoogleSignIn` test: a successful exchange with a new user gives `{ ok: true, accountExisted: false }`; route test: 303 to `/`; manual check with a real Google account on the local stack (task 5.3): signed in, no confirmation email | unit, end-to-end (manual) |
| FR-G3 · returning user through sign-in | `getGoogleCallbackTarget` test: existing account from `sign-in` gives `/`; manual check (task 5.3): sign out, sign in again from `/login`, same account | unit, end-to-end (manual) |
| FR-G3 · new account through the sign-in page | `getGoogleCallbackTarget` test: new account from `sign-in` gives `/` with no notice | unit |
| FR-G4 · cancelled on the sign-up page | `classifyGoogleCallbackError` test with the cancel parameters recorded in task 1.2 gives `cancelled`; `getGoogleCallbackTarget` gives `/signup?error=google-cancelled`; route test: 303 to it; manual cancel (task 5.3) | unit, end-to-end (manual) |
| FR-G4 · unknown refusal is a failure | `classifyGoogleCallbackError` test: `access_denied` with an unrecognised `error_code` gives `failed` | unit |
| FR-G4 · exchange fails | `finishGoogleSignIn` test: an exchange error that is not a block gives `failed`; route test: 303 to `/login?error=google-failed` | unit |
| FR-G4 · no code | `finishGoogleSignIn` test: neither `code` nor `error` gives `failed` and `exchangeCodeForSession` is not called | unit |
| FR-G4 · unknown origin | `getGoogleCallbackTarget` test: missing or hostile `from` sends a failure to `/login` | unit |
| FR-G5 · banned address signs up | Task 1.2 probe on the local stack: no row in `auth.users`; classifier test with the recorded hook-refusal parameters gives `blocked`; target `/signup?error=google-blocked`; manual check (task 5.3) | integration, unit, end-to-end (manual) |
| FR-G5 · blocked account signs in | Classifier test with `user_banned` on the callback parameters and `finishGoogleSignIn` test with `user_banned` from the exchange: both `blocked`, no session; target `/login?error=google-blocked` | unit |
| FR-G5 · block reported as access denied | Classifier test: `error=access_denied` plus a block code gives `blocked`, not `cancelled` | unit |
| FR-G6 · existing Google account presses sign-up | `didAccountExist` test: `last_sign_in_at` more than the window after `created_at` gives true, and the window's edges; `getGoogleCallbackTarget` test: existing from `sign-up` gives `/?auth-notice=account-exists`; manual check (task 5.3) | unit, end-to-end (manual) |
| FR-G6 · existing password account presses sign-up | Task 1.2 probe (d): the Google sign-in lands in the same user id; manual check (task 5.3) | integration, end-to-end (manual) |
| FR-G6 · unconfirmed password account counts as existing | `didAccountExist` test with an old `created_at` and a fresh `last_sign_in_at` gives true; task 1.2 probe (d) records the timestamps | unit, integration |
| FR-G6 · notice only for its own value | `AuthNotice` test: `account-exists` gives a `role="status"` notice, no value and another value give none; recorded browser scenario: `/?auth-notice=account-exists` | unit, end-to-end |
| FR-G7 · no open redirect | Route test: a success with `next=https://evil.example` still redirects to `/` | unit |
| FR-G7 · only GET | Route module test: it exports only `GET` | unit |
| FR-G7 · not cacheable | Route test: every outcome carries `Cache-Control: private, no-store` | unit |
| NFR-G1 · cancel is not logged | `finishGoogleSignIn` test: the cancel parameters write no log line | unit |
| NFR-G1 · failed start is logged | Action test: an Auth error writes exactly one line with the reason and code, and none of the address or URL | unit |
| NFR-G1 · failure log line | `finishGoogleSignIn` test: a failed or blocked outcome writes exactly one line with the reason and code, and none of the address, the code value, a token or the description | unit |
| NFR-G2 · build output | `npm run build` lists `/`, `/login` and `/signup` as partially prerendered (task 4.3) | integration |
| NFR-G3 · no secret in the repository | `git grep` for a client secret finds none and `supabase/config.toml` reads both values through `env(...)` (task 1.1); docs name check (task 5.1) | integration |
