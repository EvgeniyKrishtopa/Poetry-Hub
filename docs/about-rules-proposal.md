# About page: rules proposal

Deliverable of `admin-violations-feedback` (FR-13, task 6.2). The app never edits Contentful: the owner pastes
the wording below into the About page by hand. Compared on 2026-11-18 against the live `/about` text read from
the dev server.

## What the live About page says

The page is a welcome text: what the platform is, who it is for, and where it is going. It says **nothing** about
rules, blocking, or emails. So every item below is missing.

## Coverage

| Item | Where the app uses it | In the live About text |
| --- | --- | --- |
| Ground: harmful content (`harmful-content`) | Reason in the warning and in the standard email: «размещение вредоносного контента» | Missing |
| Ground: malicious activity (`malicious-activity`) | Reason in the standard email: «вредоносная активность на сайте». No warning is offered for it: it may be blocked at once | Missing |
| One-day warning period | The warning email gives «один день с момента этого письма»; after it the admin decides. A reminder only, nothing enforces it | Missing |
| Emails are sent | A warning before a block for harmful content; a standard notice after a block, ban, or delete of a poem or collection, to the account's address. A send can fail and the action still stands | Missing |

The reasons in the second column are the exact strings in `src/features/admin/model/email-copy.constants.ts`, so
a user reads one rule in the About text and in the email.

## Proposed wording (Russian, for Contentful)

Add one section at the end of the page, before the closing call to action.

**Правила сообщества**

> Поэтический хаб — место для творчества, и мы хотим, чтобы здесь было безопасно писать и читать. Поэтому
> администратор может ограничить доступ к аккаунту, если автор нарушает правила сайта. Основания две.

**Размещение вредоносного контента** (gap: ground 1)

> Нельзя публиковать произведения и сборники, которые содержат вредоносный контент. Если мы увидим такое
> нарушение, мы сначала отправим автору предупреждение.

**Вредоносная активность на сайте** (gap: ground 2)

> Нельзя использовать сайт для вредоносных действий. В этом случае аккаунт может быть заблокирован без
> предупреждения.

**Предупреждение и один день на ответ** (gap: warning period)

> После предупреждения у автора есть один день с момента письма, чтобы ответить. Затем администратор принимает
> решение: оставить всё как есть, заблокировать или забанить аккаунт.

**Письма от администрации** (gap: emails)

> О предупреждении, блокировке, бане и удалении произведения или сборника мы сообщаем письмом на адрес,
> указанный при регистрации. Письмо автоматическое. Если оно не дошло, решение администратора всё равно
> остаётся в силе.

## Before pasting

- Confirm the wording of each ground and the one-day period; they are drafts.
- Review the privacy policy: it should say the account's address is used to send these emails.
- The warning's one-day period matches `WARNING_PERIOD_MS` (24 h) in
  `src/features/admin/model/violation.constants.ts`; change both if the period changes.
