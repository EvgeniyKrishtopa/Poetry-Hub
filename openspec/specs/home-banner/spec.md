# home-banner Specification

## Purpose
TBD - created by archiving change home-contentful-content. Update Purpose after archive.
## Requirements
### Requirement: Banner retrieval (FR-B1)
The system SHALL load the published Home banner entry from Contentful and read its Title, Description and Banner image. When more than one entry is published, the most recently published one SHALL be used; when none is published, the outcome SHALL be a not-found failure.

#### Scenario: Banner exists
- **GIVEN** a published Home banner with title "Welcome", description "Poetry for readers" and a Banner image
- **WHEN** the home banner is requested
- **THEN** the result holds that title, that description and the image's address

#### Scenario: Several banners published
- **GIVEN** two published Home banner entries, the second published later with title "Newer"
- **WHEN** the home banner is requested
- **THEN** the result holds the title "Newer"

#### Scenario: No banner published
- **GIVEN** Contentful returns no Home banner entry
- **WHEN** the home banner is requested
- **THEN** the result is a not-found failure

### Requirement: Banner validation (FR-B2)
Every banner response SHALL be validated before use: Title and Description non-empty after trimming leading and trailing whitespace (the trimmed values reach the page), and the image address an `https` URL that the site is allowed to load as a remote image: on Contentful's image host and inside the project's own space. An address that the site would refuse to load SHALL NOT pass. A response that does not match SHALL produce a validation failure and no part of it SHALL reach the page.

#### Scenario: Missing image
- **GIVEN** the published banner has no Banner image
- **WHEN** the home banner is requested
- **THEN** the result is a validation failure and contains no banner

#### Scenario: Blank title
- **GIVEN** the banner's Title is "   "
- **WHEN** the home banner is requested
- **THEN** the result is a validation failure

#### Scenario: Image on another host
- **GIVEN** the banner's image address is on a host other than Contentful's image host
- **WHEN** the home banner is requested
- **THEN** the result is a validation failure and the page shows the static hero

#### Scenario: Image from another space
- **GIVEN** the banner's image address is on Contentful's image host but under a different space id than the project's
- **WHEN** the home banner is requested
- **THEN** the result is a validation failure and the page shows the static hero

#### Scenario: Space id unknown at runtime
- **GIVEN** `CONTENTFUL_SPACE_ID` is unset when the banner is requested
- **WHEN** the home banner is requested
- **THEN** the result is a configuration failure and the page shows the static hero, never a hero with an image the site cannot load

### Requirement: Banner failures are results (FR-B3)
Retrieval SHALL return a typed failure (configuration, network, authentication, HTTP, GraphQL, validation or not-found) instead of throwing for any Contentful-related failure, and SHALL log the failure kind on the server without secrets or response payloads.

#### Scenario: Missing configuration
- **GIVEN** `CONTENTFUL_ACCESS_TOKEN` is unset
- **WHEN** the home banner is requested
- **THEN** the result is a configuration failure, nothing is thrown, and the log records the `config` kind only

### Requirement: Hero shows the banner (FR-B4)
The hero SHALL show the banner's Title as the page's only `h1`, its Description beneath as plain text, and the Banner image as the full-width background. The Description keeps its line structure: each block separated by blank lines is its own paragraph and a single line break stays a line break. Markdown or HTML in it SHALL appear literally. The image is decorative (empty `alt`).

#### Scenario: Banner shown
- **GIVEN** the banner loads with title "Welcome" and description "Line one\nLine two\n\nSecond"
- **WHEN** a visitor opens `/`
- **THEN** the only `h1` reads "Welcome" and two paragraphs follow, the first on two lines
- **AND** the hero's background is the banner's image

#### Scenario: Markup is not interpreted
- **GIVEN** the banner's description is "**Bold** <b>tag</b>"
- **WHEN** a visitor opens `/`
- **THEN** the text appears literally and no bold element is rendered

### Requirement: Static hero fallback (FR-B5)
When the banner cannot be loaded for any reason, the hero SHALL show the site name as the `h1`, the static site description beneath it, and the photo shipped with the site (all three kept in the project itself, so the hero never depends on Contentful being up); the buttons «Читать произведения» (to `/authors`) and «Стать автором» (to `/signup`) SHALL still work. The two buttons are not editable in Contentful.

#### Scenario: CMS unavailable
- **GIVEN** the banner request fails with any failure kind
- **WHEN** a visitor opens `/`
- **THEN** the `h1` reads "Поэтический Хаб", the static description and the shipped photo are shown, and both buttons are present

### Requirement: Centred hero (FR-B6)
The hero's title, text and two buttons SHALL be centred horizontally at every viewport width, for the CMS content and for the fallback alike.

#### Scenario: Centred at narrow and wide widths
- **GIVEN** the hero shows any content
- **WHEN** it is rendered at 360, 768 and 1280 px
- **THEN** the title and every paragraph are centre-aligned and the buttons sit on the page's centre line

### Requirement: Fifty percent overlay (FR-B7)
A uniform black layer at 50% opacity SHALL cover the whole hero photo, above the photo and below the text, in the light and the dark theme, for the CMS photo and the shipped one alike. No other darkening (gradient, blur, a second layer) SHALL be applied to the photo.

#### Scenario: Overlay strength
- **GIVEN** the hero shows the CMS photo or the shipped one
- **WHEN** the hero is rendered in either theme
- **THEN** the layer over the photo is black at 50% opacity and spans the full hero box

#### Scenario: Overlay sits under the text
- **GIVEN** the hero shows a title and a text over its photo
- **WHEN** the hero is rendered
- **THEN** the stacking order is photo, overlay, text, so the text is not dimmed by the layer

### Requirement: Banner freshness (NFR-B1)
A publish or unpublish of the Home banner entry (not of its image Asset alone) SHALL reach the page the same way a greeting does (home-greeting NFR-2): the first request after the publish notification is accepted shows the new content, and cached banner content goes stale 60 seconds after it was fetched as a safety net.

Publishing or unpublishing the Banner image Asset alone is best-effort: the docs add Asset events to the webhook and tell editors to republish the entry after swapping the image, and otherwise the page shows the new image within the 60-second safety net. No test verifies the Asset-only path.

#### Scenario: Publish notification makes the next request fresh
- **GIVEN** the home page is cached with banner title "Welcome"
- **WHEN** the title is changed to "Hello" and published, and the publish notification is accepted
- **THEN** the first request for `/` after the notification shows "Hello"

### Requirement: Readable hero text (NFR-B2)
White hero text over the photo and overlay SHALL keep a contrast ratio of at least 4.5:1 for body text and 3:1 for large text against the lightest photo the project allows. That lightest-photo value SHALL be a named constant checked by an automated test that reads the overlay opacity from the stylesheet, and SHALL be documented as the editorial rule for the Banner image.

#### Scenario: Contrast against the allowed photo
- **GIVEN** the overlay opacity in the stylesheet and the lightest allowed photo colour
- **WHEN** the contrast test computes the text colour over photo-plus-overlay in each theme
- **THEN** the ratio meets 4.5:1 for body text and 3:1 for large text

#### Scenario: Shipped photo respects the rule
- **GIVEN** the photo shipped with the site is the hero's fallback
- **WHEN** the photo is measured: the 99th-percentile luminance of its central band (the middle 60% of its height, full width), the same measure the editor rule uses at any viewport width
- **THEN** it is no lighter than the allowed value

