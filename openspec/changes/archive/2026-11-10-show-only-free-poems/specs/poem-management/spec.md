## MODIFIED Requirements

### Requirement: Your poems page (FR-2)
`/account/poems` SHALL show the level-1 heading «Ваши Произведения»; below it, one row with the link «Добавить новое произведение» to `/account/poems/new` and the link styled as a button «Создать сборник произведений» to `/account/poems/collections/new`, in that order (add-poem-collections FR-1); then, when the author has collections, the section «Сборники произведений» (add-poem-collections FR-2); then, when the author has free poems, a list of the free poems only, newest first, each item only the title as a link to `/account/poems/<poemId>`, with no heading or text of its own (show-only-free-poems FR-1, user decision 2026-11-10). A poem in a collection SHALL NOT be in that list. With no free poems — no poems at all, or every poem in a collection — it SHALL show no poem list and no text in its place. The section SHALL be a level-2 heading «Сборники произведений» and a list of all the author's own collections, newest first, each item the title as a link to `/account/poems/collections/<collectionId>` followed, when the collection holds poems, by a nested list of its poems, newest first by the poem's creation time, each item only the title as a link to `/account/poems/<poemId>`; a collection with no poems SHALL show its title only (add-poems-to-collections FR-11, user decision 2026-11-07). With no collections, neither the heading nor the section's list SHALL be rendered. The section and the poem list SHALL agree on which poems are in a collection, so no poem is shown both under a collection and in the poem list, and, when every read succeeds, every poem of the author is shown on the page exactly once (show-only-free-poems NFR-2). When only the collections list fails, the section shows its alert and the poem list still lists free poems only; collected poems are then shown nowhere, which the section's alert explains (Gate 1 P1). A failed read of the collections or of their poems SHALL show «Не удалось загрузить сборники. Попробуйте позже.» in a `role="alert"` element in the section's place, with no heading, and SHALL NOT affect the buttons; a failed read of which poems are in a collection SHALL also replace the poem list with the list alert (poem-management FR-11, show-only-free-poems FR-2); a failed poem read SHALL NOT affect the buttons or the section (poem-management FR-11, add-poem-creation).

#### Scenario: Author with poems
- **GIVEN** a signed-in author with a public profile, no collections, and poems «Ночной вокзал» (created 2026-10-02) and «Осенний сад» (created 2026-10-01)
- **WHEN** they open `/account/poems`
- **THEN** the heading «Ваши Произведения», the links «Добавить новое произведение» (`/account/poems/new`) and «Создать сборник произведений» (`/account/poems/collections/new`) in one row, and a list of two links, in order «Ночной вокзал», «Осенний сад», each with `href="/account/poems/<that poem's id>"`, are shown
- **AND** no «Сборники произведений» heading exists

#### Scenario: Author without poems
- **GIVEN** a signed-in author with a public profile, no poems, and no collections
- **WHEN** they open `/account/poems`
- **THEN** the heading «Ваши Произведения» and both links are shown, and the page holds no list

#### Scenario: Author with collections
- **GIVEN** a signed-in author with the collections «Весна» (created 2026-11-02) and «Осенний цикл» (created 2026-11-01), both empty, and one free poem
- **WHEN** they open `/account/poems`
- **THEN** below the button row the section «Сборники произведений» lists «Весна», «Осенний цикл» in that order, each linking to `/account/poems/collections/<its id>`, and the poem list with that one poem follows the section

#### Scenario: Collections read fails
- **GIVEN** the author's collections can't be read, and their poems and which of them are in a collection can
- **WHEN** the author opens `/account/poems`
- **THEN** both links, «Не удалось загрузить сборники. Попробуйте позже.» in a `role="alert"` element, and the list of free poems are shown

#### Scenario: Membership read fails
- **GIVEN** a signed-in author with collections and poems, whose poems can be read but which of them are in a collection can't
- **WHEN** they open `/account/poems`
- **THEN** both links, «Не удалось загрузить сборники. Попробуйте позже.» in the section's place, and «Не удалось загрузить произведения. Попробуйте позже.» in the poem list's place, each in a `role="alert"` element, are shown
- **AND** no poem title link is shown on the page

#### Scenario: Only own poems
- **GIVEN** two authors with public profiles, each with poems and collections
- **WHEN** one of them opens `/account/poems`
- **THEN** only their own poems and collections are listed

#### Scenario: Collections with their poems
- **GIVEN** a signed-in author whose collection «Осенний цикл» holds «Ночной вокзал» (created 2026-10-02) and «Осенний сад» (created 2026-10-01), whose collection «Весна» holds no poems, and who has the free poem «Первый снег»
- **WHEN** they open `/account/poems`
- **THEN** under «Осенний цикл» the links «Ночной вокзал», «Осенний сад», in that order, each to `/account/poems/<its id>`, are listed, and «Весна» shows its title only
- **AND** the poem list below the section lists only «Первый снег»

#### Scenario: Every poem in a collection
- **GIVEN** a signed-in author whose only poems «Ночной вокзал» and «Осенний сад» are both in «Осенний цикл»
- **WHEN** they open `/account/poems`
- **THEN** the section lists «Осенний цикл» with both poems under it
- **AND** no list and no text follow the section

#### Scenario: Free poems in order
- **GIVEN** a signed-in author with the free poems «Первый снег» (created 2026-10-03) and «Осенний сад» (created 2026-10-01), and «Ночной вокзал» (created 2026-10-02) in «Осенний цикл»
- **WHEN** they open `/account/poems`
- **THEN** the poem list below the section is «Первый снег», «Осенний сад», in that order

### Requirement: Management read failures (FR-11)
When the own profile or the own poem list can't be read, or which own poems are in a collection can't be read, `/account/poems` SHALL show «Не удалось загрузить произведения. Попробуйте позже.» in a `role="alert"` element instead of the list; the add link SHALL still be shown when only the list failed, and both links of the button row when the membership read failed (show-only-free-poems FR-2). When the own profile can't be read, `/account/poems/new` SHALL show the same alert instead of the form.

#### Scenario: List read fails
- **GIVEN** a signed-in author with a public profile and a failing poem read
- **WHEN** they open `/account/poems`
- **THEN** the heading, the add link, and the alert «Не удалось загрузить произведения. Попробуйте позже.» are shown, and no list

#### Scenario: Membership read fails, no guessed list
- **GIVEN** a signed-in author with a public profile, readable poems, and a failing read of which poems are in a collection
- **WHEN** they open `/account/poems`
- **THEN** the heading, both links «Добавить новое произведение» and «Создать сборник произведений», «Не удалось загрузить сборники. Попробуйте позже.» in the section's place, and «Не удалось загрузить произведения. Попробуйте позже.» in the list's place are shown, and no poem list, neither all poems nor a partial one

#### Scenario: Profile read fails on the add page
- **GIVEN** a signed-in reader and a failing own-profile read
- **WHEN** they open `/account/poems/new`
- **THEN** the heading and the same alert are shown, and no form
