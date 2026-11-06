## MODIFIED Requirements

### Requirement: Your poems page (FR-2)
`/account/poems` SHALL show the level-1 heading «Ваши Произведения»; below it, one row with the link «Добавить новое произведение» to `/account/poems/new` and the link styled as a button «Создать сборник произведений» to `/account/poems/collections/new`, in that order (add-poem-collections FR-1); then, when the author has collections, the section «Сборники произведений» (add-poem-collections FR-2); then, when the author has poems, a list of all of them, newest first, each item only the title as a link to `/account/poems/<poemId>`. With no poems, it SHALL show no poem list. The section SHALL be a level-2 heading «Сборники произведений» and a list of all the author's own collections, newest first, each item only the title as a link to `/account/poems/collections/<collectionId>`; with no collections, neither the heading nor the list SHALL be rendered. A failed collections read SHALL show «Не удалось загрузить сборники. Попробуйте позже.» in a `role="alert"` element in the section's place, with no heading, and SHALL NOT affect the buttons or the poem list; a failed poem read SHALL NOT affect the buttons or the section (poem-management FR-11, add-poem-creation).

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
- **GIVEN** a signed-in author with the collections «Весна» (created 2026-11-02) and «Осенний цикл» (created 2026-11-01) and one poem
- **WHEN** they open `/account/poems`
- **THEN** below the button row the section «Сборники произведений» lists «Весна», «Осенний цикл» in that order, each linking to `/account/poems/collections/<its id>`, and the poem list follows the section

#### Scenario: Collections read fails
- **GIVEN** the collections can't be read and the poems can
- **WHEN** the author opens `/account/poems`
- **THEN** both links, «Не удалось загрузить сборники. Попробуйте позже.» in a `role="alert"` element, and the poem list are shown

#### Scenario: Only own poems
- **GIVEN** two authors with public profiles, each with poems and collections
- **WHEN** one of them opens `/account/poems`
- **THEN** only their own poems and collections are listed

### Requirement: Management pages need a public own profile (FR-2, FR-3)
On `/account/poems` and `/account/poems/new`, a signed-in reader whose own profile is missing or not public SHALL see, under the page heading, the text «Чтобы добавлять произведения, укажите имя и фамилию в профиле автора.» and a link «Перейти к профилю автора» to `/account/author`, and no list, collections section, add link, create-collection link, or form.

#### Scenario: Profile without a last name
- **GIVEN** a signed-in reader whose profile has a first name and no last name
- **WHEN** they open `/account/poems` or `/account/poems/new`
- **THEN** the not-public text and the link «Перейти к профилю автора» (`/account/author`) are shown
- **AND** no add link, create-collection link, collections section, list, or form is shown

### Requirement: Module boundaries (NFR-3)
Poem creation SHALL live in its own feature. It SHALL import other features only through their public API. `poems` SHALL import nothing from the new feature, `@/features/auth`, or the cookie Supabase client, and `authors` SHALL import neither poem feature nor `collection-management`. `poem-management` and `collection-management` SHALL NOT import each other; the route file of `/account/poems` SHALL compose them (add-poem-collections NFR-3). The Markdown editor, the safe Markdown renderer, the image file check and picker, the Supabase error classifier, and the connection-status hook and its notice SHALL each exist once, in `shared/`, used by both the profile editor and the add and edit forms; the leave guard SHALL exist beside the poem edit form, and `collection-management` keeps its own copy beside its edit form (add-poem-collections, user decision 2026-11-04). The add form and the edit form SHALL share one implementation of the fields, the field drafts, the browser check, and the focus rules (edit-poem NFR-3).

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/poems/` is searched for imports of the new feature, `@/features/auth`, and `@/shared/lib/supabase/server`; `src/features/authors/` for `@/features/poems`, `@/features/poem-management`, and `@/features/collection-management`; and `src/features/poem-management/` for `@/features/collection-management`
- **THEN** there are no matches
- **AND** no Markdown toolbar, image-type sniffing, Supabase error classifier, or `navigator.onLine` or `navigator.connection` read exists outside `src/shared/`, and `beforeunload` is listened for only in the poem edit form's and the collection edit form's leave guards

#### Scenario: One form implementation
- **GIVEN** the change is complete
- **WHEN** the add form and the edit form components are read
- **THEN** both render the same fields component and use the same form hook, and neither declares the title, text, genre, or illustration draft state itself
