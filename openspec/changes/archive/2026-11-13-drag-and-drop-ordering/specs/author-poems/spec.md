## MODIFIED Requirements

### Requirement: Poem list on the author page (FR-1)
On `/authors/<id>` for a public author, below the profile (after the about section, or after the photo when there is no about), and after the collections section «Сборники произведений» when that section is shown (public-collections FR-2), the page SHALL show a section with the level-2 heading «Произведения» followed by exactly one of: a list with one item per free poem of that author — a poem in no collection — in the author's order (drag-and-drop-ordering FR-4), each item showing only the poem's title as a link to `/authors/<id>/poems/<poemId>` (public-collections FR-3); or, when the author has no poems at all, the text «У автора пока ещё нет публикаций.» and no list (refine-author-page-and-contact FR-5); or, when the poems can't be read, the text «Произведения сейчас недоступны.» and no list, while the rest of the page still renders (add-poem-creation FR-11). When the author has poems and every one of them is in a collection, the «Произведения» section SHALL NOT be rendered (public-collections FR-3). A poem in a collection SHALL NOT appear in this section. The section SHALL keep the former list page's look (title links in the regular text colour, accent on hover, and the same spacing). It SHALL be the same for every visitor: signed out, signed in as another reader, or signed in as the owner. The page SHALL show no link to `/authors/<id>/poems`.

#### Scenario: Author with poems
- **GIVEN** a public author whose poems are «Осенний сад» (published 2026-03-12) and «Ночной вокзал» (published 2026-07-01), both in no collection
- **WHEN** an anonymous visitor opens `/authors/<id>`
- **THEN** after the about section, a level-2 heading «Произведения» is followed by a list of two links, in order, «Ночной вокзал» then «Осенний сад», each with `href="/authors/<id>/poems/<that poem's id>"`
- **AND** no poem text, date, genre, or illustration is shown, and no link «Произведения автора» exists

#### Scenario: Free poems only
- **GIVEN** a public author with the free poem «Первый снег» and the poem «Ночной вокзал» in the collection «Осенний цикл»
- **WHEN** a visitor opens `/authors/<id>`
- **THEN** the «Произведения» list holds only «Первый снег»
- **AND** the «Сборники произведений» section comes before the «Произведения» section

#### Scenario: Every poem in a collection
- **GIVEN** a public author whose every poem is in a collection
- **WHEN** a visitor opens `/authors/<id>`
- **THEN** no «Произведения» heading, list, or empty text is rendered, and the «Сборники произведений» section is shown

#### Scenario: Author without poems
- **GIVEN** a public author with no poems
- **WHEN** a visitor opens `/authors/<id>`
- **THEN** the level-2 heading «Произведения» and the text «У автора пока ещё нет публикаций.» are shown below the profile
- **AND** the poems section holds no list, and no «Сборники произведений» section is rendered, whatever empty collections the author has

#### Scenario: Poems unavailable
- **GIVEN** a public author whose profile reads fine and whose poems can't be read
- **WHEN** a visitor opens `/authors/<id>`
- **THEN** the profile is shown, the «Произведения» section shows «Произведения сейчас недоступны.» and no list, and no «Сборники произведений» section is rendered

#### Scenario: Placement without about
- **GIVEN** a public author with free poems, no collection, and no about
- **WHEN** their page renders
- **THEN** the poems section comes right after the photo or its placeholder

#### Scenario: Following a title
- **GIVEN** a visitor on `/authors/<id>` of an author with free poems
- **WHEN** they activate a poem title
- **THEN** that poem's page opens

#### Scenario: Same entry for the owner and other readers
- **GIVEN** a public author with poems, a signed-in reader who owns that profile, and a signed-in reader who doesn't
- **WHEN** each opens `/authors/<id>`
- **THEN** both see the same headings and the same links in the same order

### Requirement: Poems from the database (add-poem-creation FR-9)
An author's poems SHALL be the rows stored for that author's profile: each with a UUID id, a title, a Markdown text, an optional illustration, an optional genre (a Contentful genre tag), and a publication date equal to the UTC date of its creation. They SHALL be listed in the author's order of their list (drag-and-drop-ordering FR-1): a poem never moved by its author keeps the place newest-created-first gave it, and a new poem is first. Only poems of a public author SHALL be readable.

#### Scenario: Stored poems are listed
- **GIVEN** a public author with stored poems «Осенний сад» (created 2026-10-01) and «Ночной вокзал» (created 2026-10-02), never reordered
- **WHEN** a visitor opens `/authors/<id>`
- **THEN** the «Произведения» section lists «Ночной вокзал» then «Осенний сад»

#### Scenario: Publication date from creation time
- **GIVEN** a poem created at 2026-10-01T23:30:00Z
- **WHEN** its page renders on a server in any time zone
- **THEN** the footer shows `<time datetime="2026-10-01">` reading «1 октября 2026 г.»

#### Scenario: No mock poems
- **GIVEN** a public author with no stored poems
- **WHEN** a visitor opens `/authors/<id>`
- **THEN** the section shows «У автора пока ещё нет публикаций.», whatever the author's id
