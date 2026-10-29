## MODIFIED Requirements

### Requirement: Owner edit link (FR-15)
When the signed-in reader owns the profile, `/authors/[id]` SHALL show an "Редактировать профиль" link to `/account/author` at the top of the page, followed by a «Управление произведениями» link to `/account/poems` (add-poem-creation FR-1). Other visitors SHALL NOT see either link.

#### Scenario: Owner
- **GIVEN** the signed-in reader owns profile `<id>`
- **WHEN** they open `/authors/<id>`
- **THEN** a link "Редактировать профиль" with `href` `/account/author` is shown at the top, followed by a link «Управление произведениями» with `href` `/account/poems`

#### Scenario: Other visitor
- **GIVEN** an anonymous visitor, or a signed-in reader who does not own `<id>`
- **WHEN** they open `/authors/<id>`
- **THEN** neither a "Редактировать профиль" nor a «Управление произведениями» link is shown

### Requirement: Local test data seed (FR-22)
`supabase/seed.sql` SHALL create, on `npx supabase db reset`, five test readers with confirmed emails who can sign in, each owning a public author profile (first name, last name, and a Markdown about text holding a heading and a list), with stored poems in email order (`author1@example.test` 0, `author2@example.test` 1, `author3@example.test` 2, `author4@example.test` 3, `author5@example.test` 4; the titles and texts of the former mock set, no illustration, no genre), and one more test reader whose profile has no name and is therefore not public (refine-author-page-and-contact FR-8). The seed SHALL use `.test` email addresses and a placeholder password documented as local-only, and SHALL run only on a local reset, never on a plain `db push` (`--include-seed`, `supabase bootstrap`, and Branching preview branches would load it, so the docs forbid them against a hosted project).

#### Scenario: Reset loads exactly the seed
- **GIVEN** the local Supabase stack holds older hand-made test records
- **WHEN** `npx supabase db reset` runs
- **THEN** `auth.users` holds exactly the six seeded readers, `public.author_profiles` exactly their six profiles, and `public.poems` exactly 10 poems
- **AND** `/authors` lists exactly the five public seeded authors

#### Scenario: Every poem count is covered
- **GIVEN** the seed is loaded
- **WHEN** each public seeded author's page is opened
- **THEN** `author1@example.test`'s author shows 0 poems, `author2` 1, `author3` 2, `author4` 3, and `author5` 4

#### Scenario: A seeded reader can sign in
- **GIVEN** the seed is loaded
- **WHEN** `author1@example.test` signs in on `/login` with the seed's placeholder password
- **THEN** sign-in succeeds and `/account/author` shows that reader's profile
