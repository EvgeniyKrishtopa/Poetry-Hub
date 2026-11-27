# UI Plan

Source: Claude Design canvas `GCN2BZQF5eG454fA1PZG8z`, approved 2026-11-27 (links in proposal, Mockups).

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| `/login`: form and recovery offer (FR-5) | default: the check block (fixed 300 px) between «Пароль» and «Войти», «Войти» disabled at 50%; passed: «Войти» enabled; `error`: danger `Alert` «Не удалось пройти проверку. Попробуйте ещё раз.» directly above the block, block reset; cannot load (also no JavaScript): danger `Alert` «Для отправки формы нужна проверка. Включите JavaScript и обновите страницу.» in place of the block, «Войти» disabled; after wrong credentials: «Отправить письмо» and «Войти» disabled until a new check; Google button unaffected; `offline` unchanged | existing: `TextField`, `Button`, `Alert`, `RecoveryOffer`, `ConnectionNotice`; one new, shared: `TurnstileField` (reused by three forms) | Claude Design `LoginTurnstile`, `LoginTurnstile2` |
| `/signup` (FR-5) | as `/login` above «Зарегистрироваться», without recovery | existing: `TextField`, `Button`, `Alert`; the shared `TurnstileField` | Claude Design `SignupTurnstile` |
| Contact dialog (FR-6) | block above «Отправить», button disabled until passed; send failed: the existing danger `Alert` at the top of the form, values kept, block reset; cannot load: the danger `Alert` in place of the block | existing: `ContactDialog`, `ContactForm`, `Dialog`, `Alert`, `Button`; the shared `TurnstileField` | Claude Design `ContactTurnstile` |
| `/admin/verify`: enrolment (FR-7) | start (explanation, `primary` «Настроить»); `loading`: «Получаем QR-код…» with skeleton rows, field and button disabled, `aria-busy`; QR (black on white in both themes) with the secret in mono and the code field; pending; wrong code (danger text under the field, `aria-invalid`, focus stays); limit (danger `Alert` above the field); `error`: unavailable `Alert` and «Повторить», no form | existing: `TextField`, `Button`, `Alert`, `SessionUnavailableAlert`; one new, feature-local: `TotpEnrolment` | Claude Design `AdminVerifySetup`, `AdminVerifySetup2` |
| `/admin/verify`: code entry (FR-8) | default; pending (field disabled, button `aria-busy`); wrong code; limit; unavailable, no form; non-admin: `NotFound` | existing: `TextField`, `Button`, `Alert`, `SessionUnavailableAlert`; one new, feature-local: `TotpCodeForm`, shared with enrolment | Claude Design `AdminCode` |
| `/admin/verify`: breadcrumb trail (FR-8) | «Главная › Второй код» before enrolment, «Главная › Подтверждение входа» after | existing: `BreadcrumbsView` | Claude Design `AdminVerifySetup`, `AdminCode` |
| `/reset-password` refused session (FR-3, FR-4) | the existing link-expired state; no new screen | existing: `ResetPasswordForm`, `Alert` | described |
| Root layout error (FR-12) | `error`: the look and copy of `RootError` | existing: `RootError` markup | described |
| Public pages for an admin below `aal2` (FR-8) | controls absent, header link present | existing | described |

One difference from the mockup: it draws «Повторить» as `ghost`; the existing `SessionUnavailableAlert` draws it as `primary`, and the existing component is used as it is.
