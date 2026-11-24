# home-greeting Specification

## Purpose
TBD - created by archiving change add-contentful-home-greeting. Update Purpose after archive.
## Requirements
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

### Requirement: Content freshness (NFR-2)
**Hard deadline.** 60 seconds is a hard deadline measured from the moment an entry is published (or unpublished) in Contentful. The first request for the home page made more than 60 seconds after publishing SHALL show the new content, never a stale copy.
- The guarantee is delivered by Contentful's publish notification (see the `content-revalidation` capability). Once a notification is accepted, the very next request SHALL show the new content.
- The deadline is conditional on three things: the notification is delivered and accepted, the application runs as a single instance, and Contentful's delivery API already serves the published version when the notification is processed.

**Safety net.** As a best-effort safety net for a missed notification, cached greeting content SHALL also go stale 60 seconds after it was fetched. The page and its data are cached in nested scopes, each with stale-while-revalidate (migrate-to-cache-components). On this path, therefore, up to two request-driven refresh windows may pass before new content shows: a stale copy can be served once per level while fresh content is fetched in the background. This path is not covered by the hard deadline.

**After a failed fetch.** A page first built while Contentful was unreachable or unconfigured is cached together with the failed outcome (migrate-to-cache-components FR-3). Recovery is driven by requests, under stale-while-revalidate at both the page and data levels. The clock starts when the failed outcome was cached. If there is a request for `/` more than 60 seconds later, and another more than 60 seconds after that one, each completing its background refresh, then the next request after the second refresh SHALL show the CMS greeting. Without such requests, recovery takes longer. That is accepted, because the publish notification remains the guarantee.

#### Scenario: Publish notification makes the next request fresh
- **GIVEN** the home page is cached with title "Welcome to Poetry Hub"
- **WHEN** the title is changed to "Hello, reader" and published, and Contentful's publish notification is accepted
- **THEN** the first request for `/` after the notification shows "Hello, reader"

#### Scenario: Fallback page recovers after configuration is fixed
- **GIVEN** the home page was generated with the static fallback because the configuration was missing
- **WHEN** the configuration is provided, a request for `/` is made more than 60 seconds after the failed outcome was cached, and another more than 60 seconds after that, each one's background refresh completing
- **THEN** the next request for `/` shows the CMS greeting

### Requirement: No poem search or list on the home page (FR-10)
Nothing in `src/` or `docs/` SHALL render, reference, or describe the former home poem search, its store, the home poem list, its loading, error, and empty texts, or its three classic mock poems (add-author-poems FR-10). No recorded browser scenario SHALL expect them.

#### Scenario: Static search
- **GIVEN** the change is complete
- **WHEN** `src/`, `docs/`, and `tests/web-qa-scenarios/` are searched for `PoemSearch`, `PoemList`, `PoemCard`, `usePoemsUiStore`, `poemsListQueryOptions`, «Загрузка стихов…», «Не удалось загрузить стихи.», «По вашему запросу стихов не найдено.», and `The Road Not Taken`
- **THEN** there are no matches

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

