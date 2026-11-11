## MODIFIED Requirements

### Requirement: Database integrity under direct calls (NFR-1)
With the app bypassed and the database or Storage API called directly with the publishable key: no role SHALL insert into the poems table directly; a poem SHALL be stored only through the database's own create operation, for the caller's own public profile and within FR-6's limit; a guest SHALL NOT store a poem; nobody SHALL set a poem's id or creation time; no role SHALL update the poems table directly; a poem SHALL be updated only through the database's own update operation, only when it belongs to the caller's own public profile, and only in its title, text, genre, and illustration, whatever else the request holds; a guest SHALL NOT update a poem (edit-poem NFR-1); no role SHALL delete from the poems table directly; a poem SHALL be deleted only through the database's own delete operation, and only when it belongs to the caller's own profile, whatever else the request holds; a guest SHALL NOT delete a poem (delete-poem NFR-1); which collection a poem belongs to SHALL be readable with the poem by anyone who can read the poem (public-collections FR-1, NFR-1), and no client role SHALL change it through the poems table; it SHALL change only through the database's own collection poems save operation, which changes nothing else of a poem, and the update and create operations SHALL leave it as it is, a new poem in no collection (add-poems-to-collections NFR-1); the database SHALL reject a blank or over-long title or text, a malformed genre id, and an illustration path outside the author's own folder; poems of a non-public profile SHALL NOT be readable; and illustration uploads SHALL be limited to the own folder, 5 MB, PNG and JPEG, and illustration removals to the own folder.

#### Scenario: Direct table insert
- **GIVEN** a signed-in user with a public profile
- **WHEN** they insert a row into the poems table through the database API, with their own or another profile's `author_id`
- **THEN** the insert is rejected

#### Scenario: Create operation stores only for the caller
- **GIVEN** a signed-in user with a public profile
- **WHEN** they call the database's create operation
- **THEN** the stored poem belongs to their own profile, whatever else the request holds

#### Scenario: Insert with a non-public own profile
- **GIVEN** a signed-in user whose own profile has no last name
- **WHEN** they call the database's create operation
- **THEN** nothing is stored

#### Scenario: Update and delete
- **GIVEN** a signed-in author with a poem
- **WHEN** they try to update or delete it through the poems table directly
- **THEN** nothing changes

#### Scenario: Update operation for the owner
- **GIVEN** a signed-in author with a public profile and a poem with an illustration
- **WHEN** they call the database's update operation with that poem's id, a new title, and the illustration removed
- **THEN** the title changes, the illustration path is cleared, the answer names the old illustration path, and the poem's id, author, and creation date are unchanged

#### Scenario: Update operation for anyone else
- **GIVEN** a poem of author A
- **WHEN** a signed-in author B calls the update operation with its id, and a guest calls it with its id
- **THEN** the poem is unchanged; B gets the same answer as for an unknown id, and the guest's call is rejected

#### Scenario: Update with a non-public own profile
- **GIVEN** a signed-in author whose own profile has lost its last name
- **WHEN** they call the update operation for their own poem
- **THEN** the poem is unchanged and the answer is the same as for an unknown id

#### Scenario: Illustration path in another folder
- **GIVEN** a signed-in author with a poem
- **WHEN** they call the update operation with an illustration path in another author's folder
- **THEN** the call is rejected and the poem is unchanged

#### Scenario: Delete operation for the owner
- **GIVEN** a signed-in author with a poem
- **WHEN** they call the database's delete operation with that poem's id
- **THEN** the poem is deleted and the answer names its illustration path, if it had one

#### Scenario: Delete operation for anyone else
- **GIVEN** a poem of author A
- **WHEN** a signed-in author B calls the delete operation with its id, and a guest calls it with its id
- **THEN** the poem still exists; B gets the same answer as for an unknown id, and the guest's call is rejected

#### Scenario: Removing another author's illustration
- **GIVEN** an illustration file in author A's folder
- **WHEN** a signed-in author B removes it through the Storage API
- **THEN** the file still exists

#### Scenario: Hidden author
- **GIVEN** a poem whose author's profile has lost its last name
- **WHEN** a guest selects poems through the database API
- **THEN** that poem is not returned

#### Scenario: Collection of a poem is not readable directly
- **GIVEN** a poem of a profile that isn't public, in a collection
- **WHEN** a guest and another author select its collection from the poems table through the database API
- **THEN** no row is returned, as for every other column of that poem

#### Scenario: Collection of a poem is readable with the poem
- **GIVEN** a poem of a public author in a collection
- **WHEN** a guest, another author, and the poem's author select its collection from the poems table through the database API
- **THEN** every caller gets the collection's id, and selecting the other public columns still works as before

#### Scenario: Collection of a poem is not changeable directly
- **GIVEN** a poem in a collection
- **WHEN** a guest, another author, and the poem's author update its collection in the poems table through the database API
- **THEN** every update is rejected and the poem is still in its collection

#### Scenario: Editing keeps the collection
- **GIVEN** a poem in the collection «Осенний цикл»
- **WHEN** its author changes its title through the update operation
- **THEN** the poem is still in «Осенний цикл»
