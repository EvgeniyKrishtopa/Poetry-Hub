# UI plan: google-sign-in

Design record: `docs/design-system.md` (commit `dc22fe5`). Values from the approved Claude Design canvas (proposal.md, Mockups); every artboard shows light and dark at 1280, 768 and 360 px.

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| `/login` | default; session expired (neutral `Alert` «Сессия истекла. Войдите снова.» stays first, above the password form); offline (`ConnectionNotice` «Нет подключения к интернету. Вход через Google станет доступен, когда связь восстановится.» above the Google button, button disabled at 50%, password form usable); slow (`ConnectionNotice` «Медленное подключение к интернету. Вход через Google станет доступен, когда связь улучшится.», button disabled); pending (button disabled, `aria-busy`, label unchanged, no spinner); error (one danger `Alert` directly above the Google button: «Вы отменили вход через Google. Попробуйте ещё раз.», «Не удалось войти через Google. Попробуйте ещё раз.» (also a failed start), «Вход с этим адресом невозможен.»; the button stays enabled); error with offline (the Google alert above `ConnectionNotice`, button disabled, still one Google alert); confirm-failed (the existing danger `Alert` inside the password form, above the fields; the Google widget unchanged) | Top to bottom: `Alert` (session expired), the existing `SignInForm` (`TextField`, `Button` `primary`, link «Регистрация»), the «или» separator (14/20 `muted`, a 1 px `border` line on each side, 12 px gap), then new `GoogleSignInButton` (alert slot, `ConnectionNotice` with Google texts through its new `messages` prop, `Button` `ghost` full width with an 18 px Google "G" mark, 8 px gap, «Войти через Google»; new because no primitive starts an external sign-in with an offline guard and one alert slot) | Claude Design: `LoginGoogle` (states 1-5), `LoginGoogle2` (states 6-10) |
| `/signup` | default; offline; slow; pending; error: cancelled, failed, blocked (same texts and rules as `/login`); no session-expired notice | Top to bottom: the existing `SignUpForm` (`TextField`, `Button` `primary` «Зарегистрироваться», link «Войти»), «или», `GoogleSignInButton` with «Зарегистрироваться через Google» | Claude Design: `SignupGoogle` (states 1-4), `SignupGoogle2` (states 5-7) |
| `/` (home, after a Google sign-up into an existing account) | notice (neutral `Alert`, `role="status"`, «Аккаунт с этой почтой уже есть — вы вошли в него.», in the 896 px text column above the hero; the header shows «Выйти»); default (no notice, the hero right under the header) | new `AuthNotice` (an `Alert` tone `neutral` in `max-w-measure-text`; new because the home feature has no slot for an auth outcome), then the existing home sections unchanged | Claude Design: `HomeAccountExists` (states 1-2) |

## Acceptance criteria covered

- auth FR-1, FR-3: the Google button below each password form (rows 1, 2).
- auth FR-5 and FR-G4, FR-G5: the Google notices above the Google button; confirm-failed inside the form (rows 1, 2).
- FR-G1: start failure, one alert at a time, and pending (rows 1, 2).
- FR-G2: offline and slow, with their texts (rows 1, 2).
- FR-G6: the account-exists notice on `/` (row 3).
- FR-G3: a successful sign-in lands on `/` signed in; the header's «Выйти» is the existing `HeaderAuthLinks` (row 3).

No gap: FR-G7, NFR-G1, NFR-G2 and NFR-G3 have no human-visible outcome.
