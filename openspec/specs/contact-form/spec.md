# contact-form Specification

## Purpose
TBD - created by archiving change add-contact-form. Update Purpose after archive.
## Requirements
### Requirement: Footer button opens the contact dialog (FR-1)
The footer's navigation landmark «Информация о проекте» SHALL hold, after its two links, a «Связаться с нами» button (`<button type="button">` with `aria-haspopup="dialog"`) that SHALL look exactly like the links in every state (at rest, hover, focus): the same colour, size, and focus outline, with no button background, border, or padding. Activating it by click, Enter, or Space SHALL open the contact dialog as a modal: while it is open, nothing outside the dialog can be reached by pointer or keyboard, and focus SHALL move to the «Имя» field.

#### Scenario: Opening the dialog
- **GIVEN** any page
- **WHEN** the visitor activates «Связаться с нами» in the footer
- **THEN** a modal dialog named «Связаться с нами» is open
- **AND** the «Имя» field has focus
- **AND** repeated Tab presses never move focus outside the dialog

### Requirement: Smooth appearance (FR-2)
The dialog SHALL appear with opacity going from 0 to 1 and an upward shift going from 8 px to 0, over 200 ms with ease-out timing, while its backdrop fades in over the same 200 ms; closing SHALL play the reverse over the same time. When the visitor's system requests reduced motion (`prefers-reduced-motion: reduce`), the dialog SHALL open and close with no animation.

#### Scenario: Animated opening
- **GIVEN** a browser with no reduced-motion preference
- **WHEN** the dialog opens
- **THEN** its computed transition covers `opacity` and `transform` with a 200 ms duration
- **AND** it ends at opacity 1 with no transform

#### Scenario: Reduced motion
- **GIVEN** a browser with `prefers-reduced-motion: reduce`
- **WHEN** the dialog opens
- **THEN** its computed transition duration is 0 s

### Requirement: Backdrop never lightens the page (FR-13)
The backdrop SHALL dim the page in both colour schemes and SHALL never make any part of it lighter. In the light scheme it SHALL be the `foreground` colour at 40% opacity; in the dark scheme it SHALL be the `background` colour at 70% opacity. Both SHALL come from one design token, `--backdrop`, defined per colour scheme in `src/app/globals.css` from the existing tokens.

#### Scenario: Dark scheme
- **GIVEN** the dark colour scheme
- **WHEN** the dialog is open
- **THEN** the backdrop's computed background colour is `background` (`#0a0a0a`) at 70% opacity
- **AND** a page area that was `surface` or `foreground` text reads darker through the backdrop than without it

#### Scenario: Light scheme
- **GIVEN** the light colour scheme
- **WHEN** the dialog is open
- **THEN** the backdrop's computed background colour is `foreground` (`#171717`) at 40% opacity

### Requirement: Dialog contents (FR-3)
The dialog SHALL hold, in order: the heading «Связаться с нами», which is its accessible name; the line «Напишите нам, и мы ответим на указанную почту.»; a single-line input labelled «Имя»; an email input labelled «Электронная почта»; a multi-line text area labelled «Ваше сообщение»; and the button «Отправить». A button named «Закрыть» SHALL sit in its top corner.

#### Scenario: Fields and buttons
- **GIVEN** the dialog is open
- **WHEN** its contents are read in order
- **THEN** they are the heading «Связаться с нами», the intro line, the input «Имя», the email input «Электронная почта», the text area «Ваше сообщение», and the button «Отправить»
- **AND** a button named «Закрыть» is present

### Requirement: Closing keeps unsent input (FR-4)
The dialog SHALL close on the «Закрыть» button, on Escape, and on a click on the backdrop outside the dialog box, and focus SHALL then return to the footer's «Связаться с нами» button. Values typed and not yet sent, and the error messages from the last submit, SHALL be kept when the dialog is closed and opened again, until the page is reloaded.

#### Scenario: Escape keeps the typed name
- **GIVEN** the dialog is open with «Имя» holding `Анна`
- **WHEN** the visitor presses Escape
- **THEN** the dialog is closed and focus is on «Связаться с нами»
- **AND** when they open it again, «Имя» still holds `Анна`

#### Scenario: Close button and backdrop
- **GIVEN** the dialog is open
- **WHEN** the visitor activates «Закрыть», or clicks the backdrop outside the dialog box
- **THEN** the dialog is closed
- **AND** a click inside the dialog box does not close it

### Requirement: Validation by one Zod schema (FR-5)
Each value SHALL be trimmed of leading and trailing whitespace before it is checked. The name SHALL be 1 to 80 characters; the email SHALL be a valid address by Zod's `z.email()` and at most 254 characters; the message SHALL be optional (empty after trimming is valid) and at most 300 characters. On «Отправить», the browser SHALL check the values against the schema before sending anything; each invalid field SHALL show its message under it, and focus SHALL move to the first invalid field in form order. A field's error SHALL stay until the next submit and SHALL disappear the moment «Отправить» is activated, not when the answer arrives. The Server Action SHALL validate the same schema again and SHALL send nothing when validation fails.

Messages: name empty «Введите имя»; name too long «Имя должно быть не длиннее 80 символов»; email invalid or empty «Введите корректный адрес электронной почты»; email too long «Адрес почты должен быть не длиннее 254 символов»; message too long «Сообщение должно быть не длиннее 300 символов». An empty message has no error.

#### Scenario: Invalid values stay in the browser
- **GIVEN** the form with name `   `, email `not-an-email`, and an empty message
- **WHEN** the visitor activates «Отправить»
- **THEN** no request reaches the Server Action
- **AND** «Введите имя» and «Введите корректный адрес электронной почты» are shown under their fields, and «Ваше сообщение» shows no error
- **AND** focus is on «Имя»

#### Scenario: Length limits
- **GIVEN** a name of 81 characters, or a message of 301 characters
- **WHEN** the visitor submits
- **THEN** «Имя должно быть не длиннее 80 символов», or «Сообщение должно быть не длиннее 300 символов», is shown under that field

#### Scenario: Empty message is allowed
- **GIVEN** a valid name and email and an empty or whitespace-only message
- **WHEN** the visitor submits
- **THEN** no error is shown and the form is sent

#### Scenario: Server re-validates
- **GIVEN** the Server Action is called directly with an invalid email
- **WHEN** it runs
- **THEN** it returns validation errors
- **AND** no Telegram request is made

### Requirement: Delivery to Telegram (FR-6)
A submission that passes validation SHALL be sent by a Server Action as exactly one Telegram Bot API `sendMessage` request to the configured chat, as plain text with no `parse_mode`, in this format: `Новое сообщение с сайта <site name>`, then `Имя: <name>`, then `Почта: <email>`, and, only when the trimmed message is non-empty, an empty line and the message, using the trimmed values.

#### Scenario: Message format
- **GIVEN** valid values `  Анна  `, `anna@example.com`, and `Привет!\n<b>стихи</b>`, and working bot settings
- **WHEN** the action runs
- **THEN** exactly one `sendMessage` request goes to the Telegram Bot API with the configured `chat_id` and no `parse_mode`
- **AND** its text is `Новое сообщение с сайта Поэтический Хаб\nИмя: Анна\nПочта: anna@example.com\n\nПривет!\n<b>стихи</b>`

#### Scenario: Message format without a message
- **GIVEN** valid values `Анна`, `anna@example.com`, and a message of `   `
- **WHEN** the action runs
- **THEN** the text is `Новое сообщение с сайта Поэтический Хаб\nИмя: Анна\nПочта: anna@example.com`

### Requirement: Sending state (FR-7)
From the submit until the action answers, the submit button SHALL read «Отправка…» and SHALL be disabled, and the three fields SHALL be disabled too, so no input can be typed during sending.

#### Scenario: No double send
- **GIVEN** valid values and an action that hasn't answered yet
- **WHEN** the visitor clicks «Отправить» again
- **THEN** the button reads «Отправка…» and is disabled
- **AND** the fields «Имя», «Электронная почта», and «Ваше сообщение» are disabled
- **AND** the action has been called once

### Requirement: Success (FR-8)
When Telegram accepts the message, the form SHALL be replaced by the message «Спасибо! Ваше сообщение отправлено.» (`role="status"`) and a «Закрыть» button that closes the dialog. The first time the dialog opens after the visitor has closed the thank-you view, it SHALL show an empty form with no error messages. If the success arrives while the dialog is closed, the next open SHALL still show the thank-you view, and the empty form SHALL come on the open after that view is closed.

#### Scenario: Thank-you and a fresh form
- **GIVEN** Telegram accepts the message
- **WHEN** the action answers
- **THEN** the dialog shows «Спасибо! Ваше сообщение отправлено.» and a «Закрыть» button, and no form fields
- **AND** after closing and opening the dialog again, every field is empty and no error is shown

### Requirement: Failure (FR-9)
When the message can't be delivered (the bot settings are missing or malformed, Telegram can't be reached, it doesn't answer within 10 seconds, it answers with an error, or the browser's request to the Server Action fails with no result), the dialog SHALL stay on the form with the alert «Не удалось отправить сообщение. Попробуйте ещё раз позже.» (`role="alert"`) above the fields, keep the typed values, move focus to the «Отправить» button, and allow another submit; the page SHALL never be replaced by an error screen. The alert SHALL disappear the moment «Отправить» is activated again. Each failed delivery that reaches the action SHALL write exactly one server log line, `[contact] send failed`, holding the reason (`config`, `network`, `timeout`, or `http`) and, for `http` only, the HTTP status, and nothing else.

#### Scenario: Telegram answers with an error
- **GIVEN** Telegram answers HTTP 500
- **WHEN** the visitor submits valid values
- **THEN** the alert «Не удалось отправить сообщение. Попробуйте ещё раз позже.» is shown and the fields keep their values
- **AND** focus is on «Отправить»
- **AND** the server logged exactly one `[contact] send failed` line holding reason `http` and status 500 only

#### Scenario: Request to the server fails
- **GIVEN** the call to the Server Action rejects with no result (network down, or the hosting answers 429)
- **WHEN** the visitor submits valid values
- **THEN** the failure alert is shown, the fields keep their values, and the page is not replaced by an error screen

#### Scenario: Missing bot settings
- **GIVEN** `TELEGRAM_BOT_TOKEN` is unset
- **WHEN** the visitor submits valid values
- **THEN** the failure alert is shown, no request to Telegram is made, and one `[contact] send failed` line holds reason `config` only

### Requirement: Honeypot (FR-10)
The form SHALL include one extra text field, `website`, hidden from people: off screen, out of the tab order, hidden from assistive technology, with autocomplete off. When it arrives non-empty, the action SHALL send nothing, log nothing, and answer exactly as on success.

#### Scenario: Bot fills the hidden field
- **GIVEN** the `website` field holds `http://spam.example` and the other values are valid
- **WHEN** the action runs
- **THEN** no Telegram request is made and nothing is logged
- **AND** the dialog shows the success message

### Requirement: Open to everyone (FR-11)
Any visitor SHALL be able to send the form, signed in or not; the action SHALL read no session.

#### Scenario: Signed-out visitor
- **GIVEN** a signed-out visitor
- **WHEN** they submit valid values
- **THEN** the message is delivered and the success message is shown

### Requirement: No contact path (FR-12)
Nothing SHALL refer to `/contact`: no route, no path constant, no link, and no test or recorded browser scenario expecting anything at that path.

#### Scenario: No reference left
- **GIVEN** the change is complete
- **WHEN** `src/` and `tests/web-qa-scenarios/` are searched for the string `/contact`
- **THEN** there is no match
- **AND** the rendered HTML of `/` contains no `href="/contact"`

### Requirement: Secrets and visitor data stay on the server (NFR-1, NFR-2)
The bot token and chat id SHALL be read only on the server, from `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` (no `NEXT_PUBLIC_` prefix), inside the server-only `shared/lib/telegram` module. Neither value, nor the request URL carrying the token, SHALL appear in a log line, error message, action result, or client bundle. No log line SHALL hold the submitted name, email, or message.

#### Scenario: Nothing sensitive in logs
- **GIVEN** the action fails in each way listed in FR-9, and once with an unexpected throw
- **WHEN** `console.error` calls are captured
- **THEN** none holds the token, the chat id, the request URL, or the submitted name, email, or message

#### Scenario: Nothing in the client bundle
- **GIVEN** a production build made with a local token set
- **WHEN** the client chunks under `.next/static` are searched for the token value
- **THEN** there is no match

