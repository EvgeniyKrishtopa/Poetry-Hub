# Test Plan

One row per acceptance criterion (each THEN) of the delta specs. "Existing" means the criterion is
restated unchanged and its current test keeps closing it; it is listed so nothing drops silently.

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-1 (poem-management FR-2) | Author with poems: heading, both links in one row, two poem links newest first, no section heading | `MyPoemsContent` component test: no collections, nothing collected → both poems listed in order (existing case, given a stub `readCollectedPoems` returning none) | unit |
| FR-1 (poem-management FR-2) | Author without poems: heading, both links, no list | `MyPoemsContent` component test (existing case, stub read returning none) | unit |
| FR-1 (poem-management FR-2) | Author with collections, both empty, one free poem: section then the list with that poem | `MyPoemsContent` component test: slot rendered before the list, free poem listed | unit |
| FR-1 (poem-management FR-2) | Collections with their poems: «Первый снег» only in the plain list | `free-poems` unit test (collected excluded); `MyPoemsContent` component test with two collected and one free poem → one link in the list | unit |
| FR-1 (poem-management FR-2) | Every poem in a collection: no list and no text after the section | `free-poems` unit test (all collected → empty); `MyPoemsContent` component test → no list element, no text | unit |
| FR-1 (poem-management FR-2) | Free poems in order: «Первый снег», «Осенний сад» | `free-poems` unit test: order of the input kept; unknown collected ids ignored | unit |
| FR-1 (poem-management FR-2) | Only own poems and collections listed | Existing: own-author scoping in `MyPoemsContent` and the section's tests; membership read is the caller's own (definer function, existing pgTAP) | unit |
| FR-1, FR-2 (poem-management FR-2) | Collections read fails, poems and membership readable: section alert and the free-poem list | `MyPoemsContent` component test with the slot rendering its alert and the read returning one collected poem → free poems only listed; section's existing alert test | unit |
| FR-2 (poem-management FR-2) | Membership read fails: both links, section alert, list alert, no poem link | `MyPoemsContent` component test: `readCollectedPoems` → `{ ok: false }` → list alert, no poem link, buttons and slot present; `OwnCollectionsSection` existing test: collected read fails → section alert | unit |
| FR-2 (poem-management FR-11) | List read fails: heading, add link, alert, no list | `MyPoemsContent` component test (existing case) | unit |
| FR-2 (poem-management FR-11) | Membership read fails, no guessed list: heading, both links, both alerts, no poem list | Same `MyPoemsContent` case as above, asserting both links and no list; Gate 3 run with the membership read forced to fail is not required | unit |
| FR-2 (poem-management FR-11) | Profile read fails on the add page: alert, no form | Existing add page test | unit |
| FR-1, FR-2 | `readCollectedPoems` not called on the not-public or session-unknown branch | `MyPoemsContent` component test: read spy not called | unit |
| FR-3 (collection-management FR-13) | Deleted collection's poems move into the plain list, in order; poems of other collections not in it | Gate 3 web-qa flow, recorded as a `tests/web-qa-scenarios` scenario with cleanup | end-to-end |
| FR-3 (collection-management FR-13) | Cancel, Deleted others remain, Last one deleted, Already deleted, Failure | Existing delete button / action tests and web-qa scenario | unit / end-to-end |
| FR-3 (collection-management FR-15) | Back then Forward after a delete: no deleted collection, freed poem in the plain list on every `/account/poems`, old address 404 | Gate 3 web-qa flow (Back/Forward) | end-to-end |
| FR-4 (add-poems-to-collections FR-12) | Back after a save: collection page lists the added poem; other collection's poems page doesn't | Existing web-qa scenario for collection poems | end-to-end |
| FR-4 (add-poems-to-collections FR-12) | Plain list after a save, by link and by Back: removed poem listed, added poem not, section updated | Gate 3 web-qa flow | end-to-end |
| FR-4 (add-poems-to-collections FR-12) | Unsaved selection kept over a fresh list | Existing collection poems form tests | unit |
| NFR-1 (collection-management NFR-3) | Static check: no cross-import between the two features, `beforeunload` only in the guard | Both features' boundaries tests (existing assertions); `typecheck` proves the route passes the prop | unit |
| NFR-2 (collection-management NFR-3) | One `my_collected_poems` call per request, section and list built from it | `collection-poems` DAL test: `listCollectedPoems` is wrapped in `cache` (two calls → one RPC under the test's `cache` mock); runtime check in a dev server request (task 3.2) | unit / end-to-end |
