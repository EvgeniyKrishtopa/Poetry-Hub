## MODIFIED Requirements

### Requirement: Greeting retrieval (FR-5)
The system SHALL load the greeting entry whose `key` the caller names, and SHALL report a not-found outcome when no such published entry exists. The home page names two keys: `about_project_home` for the about section and `call_to_action_signup` for the closing invitation. The key `home_greeting` is no longer read.

#### Scenario: Home greeting exists
- **GIVEN** a published greeting with key `about_project_home`, title "About us", and a message
- **WHEN** the greeting for that key is requested
- **THEN** the result contains that title and message

#### Scenario: Home greeting missing
- **GIVEN** Contentful returns no greeting with key `call_to_action_signup`
- **WHEN** the greeting for that key is requested
- **THEN** the result is a not-found failure

#### Scenario: Old hero key unused
- **GIVEN** the home page's sections read their greetings
- **WHEN** the home page is rendered
- **THEN** no request names the key `home_greeting`

### Requirement: Response validation (FR-4)
Every greeting response SHALL be validated against the expected shape (`key`, `title`, `message`, all strings that are non-empty after trimming leading and trailing whitespace; the trimmed values are what the page receives) before use. A response that doesn't match SHALL produce a validation failure, and no part of it SHALL reach the page.

#### Scenario: Required field missing
- **GIVEN** Contentful returns a greeting without a `title`
- **WHEN** the greeting is requested
- **THEN** the result is a validation failure and contains no greeting

#### Scenario: Whitespace-only title
- **GIVEN** Contentful returns a greeting whose `title` is `"   "`
- **WHEN** the greeting is requested
- **THEN** the result is a validation failure, and the section shows its static copy

#### Scenario: Unexpected response shape
- **GIVEN** Contentful returns a `data` object without the greeting collection
- **WHEN** the greeting is requested
- **THEN** the result is a validation failure

### Requirement: Failures are results, not exceptions (FR-3, FR-7)
Retrieval SHALL return a typed failure — one of configuration, network, authentication, HTTP, GraphQL, validation, or not-found — instead of throwing for any Contentful-related failure, and SHALL log the failure kind on the server without logging secrets or response payloads.

#### Scenario: Missing configuration becomes a failure result
- **GIVEN** `CONTENTFUL_ACCESS_TOKEN` is unset
- **WHEN** a greeting is requested
- **THEN** the result is a configuration failure and nothing is thrown
- **AND** a server log entry records the `config` failure kind

#### Scenario: Authentication failure becomes a failure result
- **GIVEN** Contentful rejects the token with HTTP 401
- **WHEN** a greeting is requested
- **THEN** the result is an authentication failure
- **AND** the server log entry contains neither the token nor the response body

## ADDED Requirements

### Requirement: Greeting text is plain text (FR-8)
Wherever a greeting's message is shown (the about section and the closing invitation), it SHALL render as plain text with its line structure preserved: blocks separated by blank lines are paragraphs and a single line break stays a line break. Markdown or HTML syntax SHALL appear literally, as typed.

#### Scenario: Multi-paragraph message
- **GIVEN** the message is "Line one\nLine two\n\nSecond paragraph"
- **WHEN** the section is shown
- **THEN** two paragraphs are rendered, the first showing "Line one" and "Line two" on separate lines

#### Scenario: Markup is not interpreted
- **GIVEN** the message is "**Bold** <b>tag</b>"
- **WHEN** the section is shown
- **THEN** the text appears literally and no bold element is rendered

## REMOVED Requirements

### Requirement: Static fallback (FR-7)
**Reason**: The hero no longer shows a greeting; its fallback is defined by `home-banner` (FR-B5). The about and closing sections' fallbacks are defined by `home-sections` (FR-3, FR-6).
**Migration**: Use `home-banner` FR-B5 for the hero, `home-sections` FR-3 and FR-6 for the other two.

### Requirement: Home page renders the CMS greeting as the hero text (FR-6)
**Reason**: The hero text now comes from the Home banner, not a greeting.
**Migration**: `home-banner` FR-B4 holds the hero rendering and its plain-text rules; `home-greeting` FR-8 keeps the plain-text rules for greeting messages.
