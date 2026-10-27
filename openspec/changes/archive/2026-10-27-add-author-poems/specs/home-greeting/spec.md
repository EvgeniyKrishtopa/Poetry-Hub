## MODIFIED Requirements

### Requirement: Home page renders the CMS greeting (FR-6)
The home page SHALL render the greeting as a welcome banner (add-author-poems FR-9): a framed block with the surface background, a border, and rounded corners, holding the greeting's title as the page's main heading and its message as the text beneath it. The banner SHALL be the only content of the page's main region. The message is plain text with its line structure preserved: each block separated by one or more blank lines SHALL render as its own paragraph, and a single line break within a block SHALL render as a line break. Markdown or HTML syntax in the message SHALL NOT be interpreted; it SHALL appear literally, as typed.

#### Scenario: Greeting shown on the home page
- **GIVEN** the home greeting loads successfully with title "Welcome to Poetry Hub"
- **WHEN** a visitor opens `/`
- **THEN** the page's main heading reads "Welcome to Poetry Hub"
- **AND** the greeting's message is shown beneath the heading

#### Scenario: Greeting drawn as a banner
- **GIVEN** the home greeting loads successfully
- **WHEN** a visitor opens `/`
- **THEN** the heading and message sit inside one block with the `bg-surface`, `border`, and rounded-corner utilities
- **AND** the main region holds no search box, no «Очистить» button, and no list

#### Scenario: Multi-paragraph message
- **GIVEN** the message is "Line one\nLine two\n\nSecond paragraph"
- **WHEN** a visitor opens `/`
- **THEN** two paragraphs are shown beneath the heading
- **AND** the first paragraph shows "Line one" and "Line two" on separate lines

#### Scenario: Markup is not interpreted
- **GIVEN** the message is "**Bold** <b>tag</b>"
- **WHEN** a visitor opens `/`
- **THEN** the text "**Bold** <b>tag</b>" appears literally and no bold element is rendered

### Requirement: Static fallback (FR-7)
When the home greeting can't be loaded for any reason, the home page SHALL render the site's static name as the heading and its static description beneath it, inside the same banner.

#### Scenario: CMS unavailable
- **GIVEN** the home greeting request fails with any failure kind
- **WHEN** a visitor opens `/`
- **THEN** the page's main heading reads "Поэтический Хаб"
- **AND** the static site description is shown beneath it, inside the banner

## ADDED Requirements

### Requirement: No poem search or list on the home page (FR-10)
Nothing in `src/` or `docs/` SHALL render, reference, or describe the former home poem search, its store, the home poem list, its loading, error, and empty texts, or its three classic mock poems (add-author-poems FR-10). No recorded browser scenario SHALL expect them.

#### Scenario: Static search
- **GIVEN** the change is complete
- **WHEN** `src/`, `docs/`, and `tests/web-qa-scenarios/` are searched for `PoemSearch`, `PoemList`, `PoemCard`, `usePoemsUiStore`, `poemsListQueryOptions`, «Загрузка стихов…», «Не удалось загрузить стихи.», «По вашему запросу стихов не найдено.», and `The Road Not Taken`
- **THEN** there are no matches
