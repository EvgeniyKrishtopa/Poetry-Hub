| Requirement | Test(s) that close it | Level |
| --- | --- | --- |
| FR-1 · offer after wrong credentials | `SignInForm` test with the sign-in action returning the wrong-credentials failure: the alert, the offer text and the button «Отправить письмо» render; recorded browser scenario: a wrong password shows the offer | unit, end-to-end |
| FR-1 · same offer for an unknown address | `SignInForm` test: the wrong-credentials failure for any typed address renders the same alert and offer, the markup identical for two different addresses | unit |
| FR-1 · no offer after another failure | `SignInForm` test, one case each for `email-not-confirmed`, `restricted`, `rate-limited`, `unavailable`, `unknown`: no offer and no button | unit |
| FR-1 · the recovery-failed notice ends with the first sign-in | `SignInForm` test: opened with `initialError` `recovery-failed` (alert and offer shown), then a sign-in returning `rate-limited`: only the rate-limited alert, no offer | unit |
| FR-1 · no offer on a fresh form | `SignInForm` test with no error and no result: no offer, no button | unit |
| FR-2 · invalid address | `requestRecoveryAction` test (Supabase client mocked): "not-an-email" returns the field error and `resetPasswordForEmail` is never called; `RecoveryOffer` test shows the error under the email field and moves focus to it | unit |
| FR-2 · address with an account | Action test: `resetPasswordForEmail` resolves, result `sent`; `RecoveryOffer` test shows the sent notice | unit |
| FR-2 · asking again after a sent letter | `RecoveryOffer` test: after `sent`, the button is still there and a second press calls the action again and shows the sent notice again | unit |
| FR-2 · address without an account | Action test: the same `sent` result and the same notice text for an address Supabase answers success to as for any other (the two results compared equal) | unit |
| FR-2 · repeat letter within the minute | Mapping test (pure function) and action test: `over_email_send_rate_limit` with status 429 gives `sent`, not `rate-limited`, and logs one line naming the email send limit with no address | unit |
| FR-2 · password never reaches the action | `SignInForm` test: the recovery submit wrapper passes only the `email` entry (the action's input checked) when the form also holds a password | unit |
| FR-2 · the address stays in the field | `SignInForm` test: after the recovery button for each outcome (sent, invalid, failed) the email field still holds the typed address | unit |
| FR-2 · a new sign-in attempt clears the old outcome | `SignInForm` test: a sent notice, then a sign-in submit: only the sign-in result shows, in the one alert slot | unit |
| FR-2 · IP-wide limit | Mapping and action tests: `over_request_rate_limit`, and a bare 429 with no code, each give `rate-limited`; `RecoveryOffer` test shows the rate-limited alert above the form | unit |
| FR-2 · unlisted code with status 429 | Mapping and action tests: an unlisted code with 429 gives `unknown`, and the generic alert shows, not the rate-limited text | unit |
| FR-2 · Supabase not configured | Action test: `SupabaseConfigError` gives `unavailable`; `RecoveryOffer` test shows the unavailable text | unit |
| FR-2 · any other failure | Action test: any other error and a `serverError` give `unknown`; `RecoveryOffer` test shows the generic text | unit |
| FR-2 · the sent notice and the letter's lifetime | `RecoveryOffer` test: the sent text names 1 hour; task 1.2's check on the local stack: `otp_expiry` is 3600 | unit, integration |
| FR-3 · valid link | `/auth/confirm` route test with `confirmRecovery` succeeding: 303 to `/reset-password` | unit |
| FR-3 · expired link | Route test with `verifyOtp` failing: 303 to `/login?error=recovery-failed`; `SignInForm` test: that value renders the notice and the offer; recorded browser scenario: `/login?error=recovery-failed` shows both | unit, end-to-end |
| FR-3 · blocked account follows a link | `confirmRecovery` test: `user_banned` gives `failed`, and the redirect and the notice are those of an expired link, with no blocked wording | unit |
| FR-3 · asking again from the notice | `SignInForm` test: opened with `recovery-failed` and an address typed, the button runs the action and the sent notice shows | unit |
| FR-4 · signed in by the recovery link | `ResetPasswordPage` test with a signed-in session: the field «Новый пароль» and the button «Сохранить пароль» render | unit |
| FR-4 · signed out | `ResetPasswordPage` test with a signed-out session: `redirect` called with `/login?error=recovery-failed`; recorded browser scenario: `/reset-password` signed out lands on that notice | unit, end-to-end |
| FR-4 · session check unavailable | `ResetPasswordPage` test with `unknown`: the unavailable alert and no form | unit |
| FR-4 · done notice needs no session | `ResetPasswordPage` test with `status=updated` and no session: the done notice, no redirect, no session read; recorded browser scenario: `/reset-password?status=updated` | unit, end-to-end |
| FR-5 · short password | `updatePasswordAction` test: "abc" returns the field error and neither the allowance nor `updateUser` is called; form test shows the error under the field | unit |
| FR-5 · weak password | Action test: `updateUser` returning `weak_password` gives the weak field error; form test | unit |
| FR-5 · same as the current password | Action test: `updateUser` returning `same_password` gives the same-password field error; form test | unit |
| FR-5 · valid password | Action test: a valid password reaches `updateUser` and ends in the redirect to the success page | unit |
| FR-6 · password changed | Action test: `signOut` called with scope `global`, then `redirect` with `/reset-password?status=updated`, and `refresh` never called; `PasswordResetDone` test: the text and the link to `/login` | unit |
| FR-6 · sign-out fails after the change | Action test: `signOut` failing still redirects with `status=updated-sign-out-failed` and logs one line with the failure kind only; `PasswordResetDone` test: the sign-out-failed text and link | unit |
| FR-6 · the page after success does not bounce | `ResetPasswordPage` test: `status=updated` with the session gone renders the notice and calls no redirect; manual check (task 6.4): the real flow ends on the notice | unit, end-to-end (manual) |
| FR-7 · offline form | `ResetPasswordForm` test with the connection hook offline: field and button disabled, the connection notice above the form, pressing sends nothing | unit |
| FR-7 · offline recovery button | `RecoveryOffer` test, offline and slow: the button disabled and the notice beside it; recorded browser scenario in offline mode | unit, end-to-end |
| FR-7 · two notices on an offline sign-in page | `SignInForm` test: offline with the offer shown, a standard notice above «Отправить письмо» and the Google notice unchanged | unit |
| FR-7 · a second click while pending sends nothing | `RecoveryOffer` and `ResetPasswordForm` tests with an action that never resolves: a second click and Enter call the action once | unit |
| FR-7 · one pending request blocks both buttons | `SignInForm` test: a pending sign-in, and a pending recovery request, each disable «Войти» and «Отправить письмо» | unit |
| FR-7 · back online | `ResetPasswordForm` and `RecoveryOffer` tests: status goes from offline to online, the notice disappears and the controls are enabled | unit |
| FR-8 · session ended while the form was open | Action test: no session returns `link-expired` with no allowance and no `updateUser`; page test: the alert and the link to `/login` and no form | unit |
| FR-8 · any other failure | Action test: any other error and a `serverError` give the generic failure; form test shows the alert above the form | unit |
| FR-8 · password is not kept | `ResetPasswordForm` test: after each failed submit the password field is empty | unit |
| FR-9 · sixth attempt within a minute | pgTAP test in `supabase/tests/write_rate_limits.test.sql`: five `consume_write_allowance('password_reset')` calls `true`, the sixth `false`; action test: `false` returns the limit failure and `updateUser` is not called | integration, unit |
| FR-9 · window restarts | pgTAP test: after the window passed the call returns `true` and the counter is 1 | integration |
| FR-9 · allowance check fails | Allowance helper and action tests: an RPC error and a non-boolean answer both fail closed and `updateUser` is not called | unit |
| FR-9 · unknown scope still refused | pgTAP test: inserting a row with another scope violates `write_rate_limits_scope_check` | integration |
| FR-9 · the letter has no counter of the app's own | Action test: `requestRecoveryAction` never calls `consume_write_allowance`; the mapping tests of FR-2 cover Supabase's refusals | unit |
| FR-10 · blocked address asks for a letter | Action test: the result and the notice for an address Supabase treats as blocked equal those of any address | unit |
| FR-10 · restricted session tries to save | Action test: `consume_write_allowance` raising for a restricted caller fails closed, `updateUser` not called, generic alert | unit |
| FR-11 · trail | Breadcrumbs model test: the row for `RESET_PASSWORD_PATH` gives «Главная», «Новый пароль», the last item not a link with `aria-current="page"`; the slot-page test in `app/tests/` stays green | unit |
| FR-12 · head | `getResetPasswordPageMetadata` test: `noindex, follow`, the title «Новый пароль», the canonical URL, no description, `og:` or `twitter:`; `public-pages-metadata` test stays green | unit |
| FR-13 · not listed | `getSitemapEntries` test: `/reset-password` is not among the entries | unit |
| FR-14 · hints on fresh pages | `/login` and `/signup` page tests: each static hint renders directly under its Google button; recorded browser scenario shows both | unit, end-to-end |
| FR-14 · the hint does not depend on a failure | `SignInForm` and page tests: the sign-in hint is identical with any failure and with none | unit |
| FR-14 · answers stay generic | Sign-in and sign-up action tests: a Google-tied address and an address with no account give the same wrong-credentials failure and the same check-email result | unit |
| NFR-1 · failed request logs nothing sensitive | `requestRecoveryAction` test: with `console.error` and `console.warn` spied, no logged line contains the address | unit |
| NFR-1 · failed save logs nothing sensitive | `updatePasswordAction` test: no logged line contains the password, on each failure and on the sign-out-failed path | unit |
| NFR-1 · no address in a URL | `RecoveryOffer` test: the recovery submit navigates nowhere and no link carries the address | unit |
| NFR-2 · field error wiring | `ResetPasswordForm` test: `aria-invalid="true"` and `aria-describedby` pointing at the error text | unit |
| NFR-2 · done notice takes focus | `PasswordResetDone` test: the notice has focus after the first render for both status values | unit |
| NFR-2 · sent notice is a live region | `RecoveryOffer` test: the sent notice is inside an element with `role="status"` | unit |
| NFR-3 · dependencies and colors | Task 6.3's check: `package.json` unchanged and no color literal in the new styles | unit |
| NFR-4 · rendered per request | `npm run build` route table (task 6.3): `/reset-password` is neither static nor cached | end-to-end (manual) |
| auth FR-2 · invalid input, successful sign-in, email not confirmed, rate limited, not configured, any other failure | Existing sign-in action and form tests stay green; the email-not-confirmed form test also asserts that no offer shows | unit |
| auth FR-2 · wrong credentials | Existing wrong-credentials test stays green and also asserts the offer under the alert | unit |
| auth FR-5 · valid link, no open redirect | Route tests for `type=email` and `type=recovery`: 303 to `/` and `/reset-password`, and `next=https://evil.example` ignored for both | unit |
| auth FR-5 · invalid link | Route and `getConfirmTarget` tests: a missing hash, an unknown or missing type, an email-link failure and a missing config each give `/login?error=confirm-failed`, and `verifyOtp` is not called without a hash | unit |
| auth FR-5 · valid recovery link, invalid recovery link | Route tests: `type=recovery` verified gives `/reset-password`; a missing hash, a failure and a missing config each give `/login?error=recovery-failed` | unit |
| auth FR-5 · confirm-failed, recovery-failed and Google messages | Existing confirm-failed and Google-notice tests stay green; a new `SignInForm` test for the recovery-failed alert and the offer | unit |
| auth FR-14 · hints on fresh pages, no dependence on failure, answers stay generic | Same tests as password-recovery FR-14 above | unit, end-to-end |
| page-metadata FR-7 · login and reset-password heads | Existing login head test stays green; the reset-password head test of FR-12 | unit |
| breadcrumbs · reset-password trail | The trail test of FR-11 | unit |
| crawler-discovery · reset-password not listed | The sitemap test of FR-13 | unit |
| FR-1, FR-2, FR-3, FR-5, FR-6 · the whole flow with a real letter | Manual run on the local stack with the mail catcher (task 6.4): wrong password, the offer, the letter, the link, a new password, the notice, signing in with it, the old password refused, the same link again | end-to-end (manual) |
