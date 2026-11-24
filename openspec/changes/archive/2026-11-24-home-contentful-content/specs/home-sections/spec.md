## MODIFIED Requirements

### Requirement: Hero (FR-1)
The home page SHALL open with a hero: a background image that spans the full width of the viewport, edge to edge (wider than the page's text column, as the owner's brief says «на всю ширину экрана»), a title as the page's only `h1`, a text beneath it, and two links styled as buttons: «Читать произведения» to `/authors` and «Стать автором» to `/signup`. The title, text and image come from the Contentful Home banner (`home-banner` FR-B4); when it cannot be loaded, the hero SHALL show the site name as the `h1`, the static site description and the photo shipped with the site, and both buttons SHALL still work (`home-banner` FR-B5). The centred layout and the 50% overlay are owned by `home-banner` (FR-B6, FR-B7).

#### Scenario: Hero with the CMS greeting
- **GIVEN** the Home banner loads with title "Welcome", a description and an image
- **WHEN** a visitor opens `/`
- **THEN** the page's only `h1` reads "Welcome" and the description is shown beneath it, over the banner's image
- **AND** a link «Читать произведения» leads to `/authors` and a link «Стать автором» leads to `/signup`

#### Scenario: Hero when the CMS is unavailable
- **GIVEN** the Home banner fails with any failure kind
- **WHEN** a visitor opens `/`
- **THEN** the `h1` reads "Поэтический Хаб", the static description and the shipped photo are shown, and both buttons are present

### Requirement: About the project (FR-3)
The page SHALL show a section with a heading, a short text on the project's idea and values, and a link «Подробнее о проекте» to `/about`. The heading and text come from the Greeting entry with key `about_project_home` (its title and message, as plain text); when it cannot be loaded, the section SHALL show the project's static heading and text and stay in place. The link is not editable in Contentful.

#### Scenario: About section
- **GIVEN** the greeting `about_project_home` loads with title "О нас" and a message
- **WHEN** a visitor opens `/`
- **THEN** the section shows "О нас" as its heading and the message beneath, and its link leads to `/about`

#### Scenario: About section when the CMS is unavailable
- **GIVEN** the greeting `about_project_home` fails with any failure kind
- **WHEN** a visitor opens `/`
- **THEN** the section shows its static heading and text, and its link leads to `/about`

### Requirement: Closing invitation (FR-6)
The page SHALL end, for a visitor who is not signed in, with a section holding a heading, a short motivating text and one button «Присоединиться к проекту» leading to `/signup`. The heading and text come from the Greeting entry with key `call_to_action_signup` (its title and message, as plain text); when it cannot be loaded, the section SHALL show its static heading and text. A signed-in reader, an admin included, SHALL NOT see this section: it invites people to join, and they already have. The button is not editable in Contentful.

#### Scenario: Closing section for a guest
- **GIVEN** a visitor who is not signed in and the greeting `call_to_action_signup` loads with title "Join us" and a message
- **WHEN** they open `/`
- **THEN** the last section shows "Join us" and the message, and its button leads to `/signup`

#### Scenario: Closing section when the CMS is unavailable
- **GIVEN** a visitor who is not signed in and the greeting `call_to_action_signup` fails
- **WHEN** they open `/`
- **THEN** the last section shows its static heading and text, and its button leads to `/signup`

#### Scenario: No closing section for a signed-in reader
- **GIVEN** a signed-in reader
- **WHEN** they open `/`
- **THEN** the closing invitation and its button are absent, the other five sections render, and no read of the closing greeting is made for them

#### Scenario: No closing section for an admin
- **GIVEN** a signed-in admin
- **WHEN** they open `/`
- **THEN** the closing invitation is absent
