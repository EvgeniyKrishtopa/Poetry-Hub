## MODIFIED Requirements

### Requirement: Poem list on the author page (FR-1)
On `/authors/<id>` for a public author, below the profile (after the about section, or after the photo when there is no about), and after the collections section «Сборники произведений» when that section is shown (public-collections FR-2), the page SHALL show a section with the level-2 heading «Произведения» followed by exactly one of: a list with one item per free poem of that author — a poem in no collection — newest first, each item showing only the poem's title as a link to `/authors/<id>/poems/<poemId>` (public-collections FR-3); or, when the author has no poems at all, the text «У автора пока ещё нет публикаций.» and no list (refine-author-page-and-contact FR-5); or, when the poems can't be read, the text «Произведения сейчас недоступны.» and no list, while the rest of the page still renders (add-poem-creation FR-11). When the author has poems and every one of them is in a collection, the «Произведения» section SHALL NOT be rendered (public-collections FR-3). A poem in a collection SHALL NOT appear in this section. The section SHALL keep the former list page's look (title links in the regular text colour, accent on hover, and the same spacing). It SHALL be the same for every visitor: signed out, signed in as another reader, or signed in as the owner. The page SHALL show no link to `/authors/<id>/poems`.

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

### Requirement: One cached read per author (add-poem-creation NFR-4)
An author's poems, each with the collection it belongs to, SHALL be read through one cached entry per author, shared by the public author page, the public poem page, the public collection page, and the author's management pages. That entry and the author's public collections entry (public-collections NFR-2) SHALL carry the same one tag per author. A successful read SHALL be kept for hours, a failed one for seconds only. Creating, editing, and deleting a poem, editing or deleting a collection, and a collection poems save that stored a change SHALL each expire that author's tag and no other (delete-poem FR-8, public-collections FR-7); deleting a collection SHALL expire it whatever the profile's public status at that moment. Creating a collection SHALL NOT expire it: a new collection is empty, so no public page shows it.

#### Scenario: One entry serves both areas
- **GIVEN** an author's public page was just rendered from a fresh read
- **WHEN** the author opens `/account/poems` within the cache lifetime
- **THEN** no second database read of that author's poems happens

#### Scenario: Failure is short-lived
- **GIVEN** a poem read that failed because the database was unreachable, and the database is back
- **WHEN** the page is requested again after a few seconds
- **THEN** the poems are shown

#### Scenario: Public pages after a delete
- **GIVEN** a cached public author page listing «Первый снег» and its cached public poem page
- **WHEN** its author deletes «Первый снег» and a guest then opens `/authors/<id>` and the poem's URL
- **THEN** the «Произведения» list doesn't show «Первый снег», and the poem URL renders the 404 page
- **AND** another author's cached pages are not re-read

#### Scenario: Public pages after a collection poems save
- **GIVEN** a cached public author page listing the free poem «Первый снег»
- **WHEN** its author adds «Первый снег» to the collection «Осенний цикл» and a guest then opens `/authors/<id>`
- **THEN** «Первый снег» is listed under «Осенний цикл» and not in the «Произведения» list
- **AND** another author's cached pages are not re-read
