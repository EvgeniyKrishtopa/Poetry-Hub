## MODIFIED Requirements

### Requirement: Your poems page (FR-2)
`/account/poems` SHALL show the level-1 heading «Ваши Произведения»; below it, one row with the link «Добавить новое произведение» to `/account/poems/new` and the link styled as a button «Создать сборник произведений» to `/account/poems/collections/new`, in that order (add-poem-collections FR-1); then, when the author has collections, the section «Сборники произведений» (add-poem-collections FR-2); then, when the author has free poems, a list of the free poems only, in the author's order (drag-and-drop-ordering FR-4, FR-9), each item only the title as a link to `/account/poems/<poemId>`, with no heading or text of its own (show-only-free-poems FR-1, user decision 2026-11-10). A poem in a collection SHALL NOT be in that list. With no free poems — no poems at all, or every poem in a collection — it SHALL show no poem list and no text in its place. The section SHALL be a level-2 heading «Сборники произведений» and a list of all the author's own collections, in the author's order (drag-and-drop-ordering FR-5, FR-9), each item the title as a link to `/account/poems/collections/<collectionId>` followed, when the collection holds poems, by a nested list of its poems in the author's order (drag-and-drop-ordering FR-2, FR-3, FR-9), each item only the title as a link to `/account/poems/<poemId>`; a collection with no poems SHALL show its title only (add-poems-to-collections FR-11, user decision 2026-11-07). With no collections, neither the heading nor the section's list SHALL be rendered. The section and the poem list SHALL agree on which poems are in a collection, so no poem is shown both under a collection and in the poem list, and, when every read succeeds, every poem of the author is shown on the page exactly once (show-only-free-poems NFR-2). When the collections can't be read, the page SHALL show «Не удалось загрузить сборники. Попробуйте позже.» in a `role="alert"` element in the place of the section and the poem list, with no heading, no board, and no poem title link; when the poems can't be read (alone or together with the collections), it SHALL show «Не удалось загрузить произведения. Попробуйте позже.» in the same place instead, in the same way (drag-and-drop-ordering design D4, user decision 2026-11-11: one alert, no half board). Either failure SHALL NOT affect the buttons (poem-management FR-11, add-poem-creation).

The collections section and the free poems list SHALL be the drag-and-drop board of `work-ordering` (drag-and-drop-ordering FR-2 – FR-7) whenever the author has at least one poem or collection, even when nothing can be moved yet (a single free poem still shows its handle; user decision 2026-11-11); the page's route file SHALL compose it. A new poem SHALL be the first of the free poems (drag-and-drop-ordering FR-1, FR-10).

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
- **GIVEN** the author's collections can't be read
- **WHEN** the author opens `/account/poems`
- **THEN** both links and «Не удалось загрузить сборники. Попробуйте позже.» in a `role="alert"` element are shown, with no board and no poem title link

#### Scenario: Membership read fails
- **GIVEN** a signed-in author whose poems, together with the collection each one is in, can't be read (the board makes one poems read, which carries the membership)
- **WHEN** they open `/account/poems`
- **THEN** both links and «Не удалось загрузить произведения. Попробуйте позже.» in a `role="alert"` element are shown, with no board and no poem title link

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

#### Scenario: A new poem is first among the free poems
- **GIVEN** an author with the free poems «Осенний сад» then «Ночной вокзал», dragged into that order
- **WHEN** the author creates «Первый снег»
- **THEN** `/account/poems` lists «Первый снег», «Осенний сад», «Ночной вокзал»
