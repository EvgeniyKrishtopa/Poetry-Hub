# Spec Delta

## REMOVED Requirements

### Requirement: Home page renders the CMS greeting (FR-6)
**Reason**: The greeting was the only content of the main region, drawn in a framed banner. The home page now has six sections and the greeting is the hero's text (home-page-sections FR-1), so the banner and the "only content" rule no longer hold.
**Migration**: Replaced by "Home page renders the CMS greeting as the hero text (FR-6)" below; the paragraph, markup and heading scenarios carry over unchanged.

## ADDED Requirements

### Requirement: Home page renders the CMS greeting as the hero text (FR-6)
The home page SHALL render the greeting as the hero's text (home-page-sections FR-1): the greeting's title as the page's main heading and its message as the text beneath it, over the hero's background image. The hero is the first section of the page's main region, followed by the other home sections. The message is plain text with its line structure preserved: each block separated by one or more blank lines SHALL render as its own paragraph, and a single line break within a block SHALL render as a line break. Markdown or HTML syntax in the message SHALL NOT be interpreted; it SHALL appear literally, as typed.

#### Scenario: Greeting shown on the home page
- **GIVEN** the home greeting loads successfully with title "Welcome to Poetry Hub"
- **WHEN** a visitor opens `/`
- **THEN** the page's main heading reads "Welcome to Poetry Hub"
- **AND** the greeting's message is shown beneath the heading

#### Scenario: Greeting drawn in the hero
- **GIVEN** the home greeting loads successfully
- **WHEN** a visitor opens `/`
- **THEN** the heading and message sit in the hero, the first section of the main region, over the background image
- **AND** the main region holds no search box and no «Очистить» button

#### Scenario: Multi-paragraph message
- **GIVEN** the message is "Line one\nLine two\n\nSecond paragraph"
- **WHEN** a visitor opens `/`
- **THEN** two paragraphs are shown beneath the heading
- **AND** the first paragraph shows "Line one" and "Line two" on separate lines

#### Scenario: Markup is not interpreted
- **GIVEN** the message is "**Bold** <b>tag</b>"
- **WHEN** a visitor opens `/`
- **THEN** the text "**Bold** <b>tag</b>" appears literally and no bold element is rendered

## MODIFIED Requirements

### Requirement: Static fallback (FR-7)
When the home greeting can't be loaded for any reason, the home page SHALL render the site's static name as the heading and its static description beneath it, inside the hero.

#### Scenario: CMS unavailable
- **GIVEN** the home greeting request fails with any failure kind
- **WHEN** a visitor opens `/`
- **THEN** the page's main heading reads "Поэтический Хаб"
- **AND** the static site description is shown beneath it, inside the hero
