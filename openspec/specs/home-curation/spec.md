# home-curation Specification

## Purpose
TBD - created by archiving change home-page-sections. Update Purpose after archive.
## Requirements
### Requirement: Choose from the page (FR-8)
A signed-in admin SHALL see a «Показать на главной» control on every public poem page and every public author page, including the admin's own poem and own author page (the moderation controls stay hidden there; this control checks only that the reader is an admin). Pressing it SHALL add that poem or author at the end of its list. A guest or a non-admin SHALL NOT see the control and the page SHALL NOT make an admin check for them beyond the existing one-per-request answer. At most 4 poems and at most 4 authors can be chosen: pressing it when the list is full SHALL change nothing and show a message that the limit is reached; pressing it for an entry already chosen SHALL change nothing and say it is already shown.

#### Scenario: Admin adds a poem
- **GIVEN** an admin and 3 chosen poems
- **WHEN** the admin presses «Показать на главной» on a public poem page
- **THEN** the poem becomes the fourth chosen poem and a success message is shown
- **AND** the next request for `/` lists it as the fourth card

#### Scenario: Limit reached
- **GIVEN** an admin and 4 chosen poems
- **WHEN** the admin presses the control on a fifth poem
- **THEN** nothing is written and a message says the limit of 4 is reached

#### Scenario: Already chosen
- **GIVEN** a poem that is already chosen
- **WHEN** an admin presses the control on its page
- **THEN** nothing is written and a message says it is already on the home page

#### Scenario: Admin's own poem
- **GIVEN** an admin who has a public author profile and a poem of their own
- **WHEN** they open that poem's page
- **THEN** «Показать на главной» is shown and works
- **AND** the delete and add-to-review-list controls are not shown

#### Scenario: Author page
- **GIVEN** an admin and 2 chosen authors
- **WHEN** the admin presses the control on a public author page
- **THEN** the author becomes the third chosen author

#### Scenario: Guest sees no control
- **GIVEN** a signed-out visitor
- **WHEN** they open a poem page
- **THEN** no «Показать на главной» control is rendered

### Requirement: The admin's home page list (FR-9)
The site SHALL have a closed page `/admin/home` for admins, listing the chosen poems and the chosen authors, each in its order, with the poem's title and author name or the author's name. An admin SHALL be able to change the order inside each list by dragging an entry to another place (with a mouse, by touch, or with the keyboard), the new order being saved when the entry is dropped, and to remove an entry. An entry SHALL NOT move between the poem list and the author list. A drop that finds the list changed meanwhile SHALL change nothing and show the real list. A non-admin and a guest SHALL get the same answer as for `/admin` (never a redirect that reveals the page), the page is never cached and is `noindex` through the `(authorized)` group.

#### Scenario: Reorder
- **GIVEN** an admin and chosen poems A, B, C in that order
- **WHEN** the admin drags C and drops it before B
- **THEN** the list reads A, C, B and the next request for `/` shows the cards in that order

#### Scenario: Stale drop
- **GIVEN** an admin who sees A, B, C while another admin has already removed A
- **WHEN** the first admin drops C at the top
- **THEN** nothing is written and the page shows the real list B, C

#### Scenario: Keyboard reorder
- **GIVEN** an admin using only the keyboard
- **WHEN** they pick up an entry, move it and drop it
- **THEN** the order is saved the same way as for a mouse drop

#### Scenario: Remove
- **GIVEN** a chosen author
- **WHEN** the admin removes them on `/admin/home`
- **THEN** the author is gone from the list and from the home page's next render

#### Scenario: Non-admin
- **GIVEN** a signed-in reader who is not an admin
- **WHEN** they open `/admin/home`
- **THEN** they get the same not-found screen as for `/admin`

### Requirement: Admin-only guarded writes (FR-10)
Adding, moving and removing entries SHALL be possible only through guarded database functions that check the caller is an admin before anything else, and the tables SHALL accept no direct insert, update or delete from the client roles. The limit of 4 per list and the uniqueness of an entry SHALL be enforced in the database, not only in the UI. Reading the list for the public home page SHALL return only entries whose poem or author is public.

#### Scenario: Non-admin cannot write
- **GIVEN** a signed-in non-admin
- **WHEN** the browser calls an add, move or remove function
- **THEN** the call is refused and no row changes

#### Scenario: Direct table write refused
- **GIVEN** a signed-in admin
- **WHEN** the browser inserts into either table directly
- **THEN** the insert is refused

#### Scenario: Limit holds under two simultaneous adds
- **GIVEN** 3 chosen poems
- **WHEN** two admins add different poems at the same moment
- **THEN** exactly one succeeds and the list has 4 entries

### Requirement: A chosen item that goes away leaves (FR-11)
A chosen poem or author SHALL NOT appear on the home page once the poem or the author's profile is deleted, or the author is no longer public (a public author is one with a first and last name set). An entry whose poem or profile is deleted SHALL be removed from the list with it, the remaining entries keep their order, and the freed slot can be filled. An entry whose author is no longer public but still exists SHALL stay on `/admin/home`, marked as not shown, until an admin removes it, so no slot is held invisibly.

#### Scenario: Author deletes a chosen poem
- **GIVEN** a chosen poem
- **WHEN** its author deletes it
- **THEN** `/` and `/admin/home` no longer show it and the list has one free slot

#### Scenario: Admin deletes a chosen poem
- **GIVEN** a chosen poem
- **WHEN** an admin deletes it as moderation
- **THEN** `/` and `/admin/home` no longer show it

#### Scenario: Author's profile is deleted
- **GIVEN** a chosen author with a chosen poem
- **WHEN** the author's profile is deleted
- **THEN** neither the author card nor the poem card is shown, and both entries are gone from `/admin/home`

#### Scenario: Author stops being public
- **GIVEN** a chosen author who is no longer public
- **WHEN** a visitor opens `/` and an admin opens `/admin/home`
- **THEN** the home page shows no card for them and the admin's list shows the entry marked as not shown, with a remove button

### Requirement: Admin change shows on the next request (FR-13)
After an admin's add, move or remove succeeds, the next request for `/` SHALL show the new list. A write that fails SHALL NOT expire the home page.

#### Scenario: Fresh after add
- **GIVEN** the home page is cached without poem P
- **WHEN** an admin adds P and then a visitor opens `/`
- **THEN** the page shows P

#### Scenario: Failed write keeps the cache
- **GIVEN** an add that the database refuses
- **WHEN** the action ends
- **THEN** the home page's cache is not expired

### Requirement: Admin writes are quiet and bounded (NFR-6)
A failed admin write SHALL be logged by operation and error kind only, never with a title, a name or an id (admin writes carry no per-user rate limit today, ADR 0015; the 4-entry cap bounds the table). `home`, `poems`, `authors` and `collections` SHALL NOT import `admin`; the route files pass the control in through the existing moderation slot.

#### Scenario: Boundary
- **WHEN** the import graph is checked
- **THEN** no module of `home`, `poems`, `authors` or `collections` imports `admin`, and `admin` does not import `home`

