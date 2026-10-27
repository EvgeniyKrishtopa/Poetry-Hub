## MODIFIED Requirements

### Requirement: Success (FR-8)
When Telegram accepts the message, the form SHALL be replaced by the message «Спасибо! Ваше сообщение отправлено.» (`role="status"`) and a «Закрыть» button that closes the dialog. While the thank-you view is shown in the open dialog, the dialog SHALL close by itself 3 seconds after the view became visible, exactly as activating «Закрыть» closes it (refine-author-page-and-contact FR-1). Pointer, focus, and keyboard activity inside the dialog SHALL neither pause nor restart the timer; only closing the dialog cancels it. Only the thank-you view closes the dialog by itself: the form, its validation errors, the sending state, and the failure alert never do. Closing the dialog earlier by any means («Закрыть», Escape, or the dialog's close button) SHALL cancel that timer, so a later open is never closed by it. The first time the dialog opens after the thank-you view has closed, it SHALL show an empty form with no error messages. If the success arrives while the dialog is closed, the next open SHALL still show the thank-you view, the 3 seconds SHALL start at that open, and the empty form SHALL come on the open after that view is closed.

#### Scenario: Thank-you and a fresh form
- **GIVEN** Telegram accepts the message
- **WHEN** the action answers
- **THEN** the dialog shows «Спасибо! Ваше сообщение отправлено.» and a «Закрыть» button, and no form fields
- **AND** after closing and opening the dialog again, every field is empty and no error is shown

#### Scenario: Dialog closes by itself after 3 seconds
- **GIVEN** the dialog is open and the thank-you view has just appeared
- **WHEN** 3 seconds pass, whatever the visitor does inside the dialog meanwhile (pointer movement, Tab, text selection) short of closing it
- **THEN** the dialog is closed and focus is on the «Связаться с нами» button
- **AND** the next open shows every field empty and no error

#### Scenario: Thank-you view still open just before 3 seconds
- **GIVEN** the dialog is open and the thank-you view has just appeared
- **WHEN** 2.9 seconds pass
- **THEN** the dialog is still open and shows the thank-you view

#### Scenario: Closing early cancels the timer
- **GIVEN** the thank-you view appeared in the open dialog
- **WHEN** the visitor activates «Закрыть» after 1 second and reopens the dialog 1 second later
- **THEN** the dialog shows the empty form and is still open 5 seconds after the reopen

#### Scenario: Success while the dialog is closed
- **GIVEN** the visitor submitted and closed the dialog before the action answered, and Telegram accepted the message
- **WHEN** the visitor opens the dialog
- **THEN** the thank-you view is shown, and the dialog closes 3 seconds after that open

#### Scenario: No auto-close without success
- **GIVEN** the dialog is open on the form, after a validation error, or after the failure alert «Не удалось отправить сообщение. Попробуйте ещё раз позже.»
- **WHEN** 5 seconds pass
- **THEN** the dialog is still open and shows the same state
