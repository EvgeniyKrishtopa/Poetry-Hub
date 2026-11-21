| Requirement | Test(s) that close it | Level |
| --- | --- | --- |
| FR-1 · hero with the CMS greeting | `HomeHero` component test: the one `h1` is the greeting title, the message is beneath it, both buttons' targets are `/authors` and `/signup` | unit |
| FR-1 · hero when the CMS is unavailable | `HomeHero` test with the fallback greeting: `h1` «Поэтический Хаб», static description, both buttons present | unit |
| FR-2 · four chosen poems | `HomeFeaturedWorks` test: four cards in the given order with title, author name and link, one with the placeholder cover; recorded browser scenario for the page | unit, end-to-end |
| FR-2 · nothing chosen | `HomeFeaturedWorks` test: an empty result renders nothing, no heading | unit |
| FR-2 · fewer than four chosen | `HomeFeaturedWorks` test: two cards, no empty slot | unit |
| FR-2 · no «Все произведения» link | `HomeFeaturedWorks` test asserts the link is absent | unit |
| FR-3 · about section | `HomeAbout` test: heading, text and the `/about` link | unit |
| FR-4 · chosen authors | `HomeAuthors` test: cards in order with photo or avatar, name, link; an empty `about` gives no description | unit |
| FR-4 · long about text is shortened | `toAuthorDescription` model test: Markdown input gives a plain excerpt of at most 120 characters ending with «…» | unit |
| FR-4 · no author chosen | `HomeAuthors` test: nothing rendered | unit |
| FR-5 · newest four | `listLatestPoems` DAL test (client mocked): order `created_at desc, id desc`, limit 4; `HomeLatestWorks` test: title, author name, link; recorded browser scenario for the order on the page | unit, end-to-end |
| FR-5 · poem of a removed author | `listLatestPoems` test: a poem the public client does not return is absent; `home-sections` test: a poem whose author is missing from the public author list is dropped, so fewer than four may show | unit |
| FR-5 · no poems at all | `HomeLatestWorks` test: nothing rendered | unit |
| FR-6 · closing invitation | `HomeJoinCta` test: heading, text, button to `/signup` | unit |
| FR-7 · one read fails | `home-sections` test: one poem read down, the other poem section and the authors section still `ok`; page test: the other sections render and one log line holds the failure kind only | unit |
| FR-7 · the author list fails | `home-sections` test: author list down, all three sections `ok: false` together; page test: hero, about and closing render | unit |
| FR-7 · all reads fail | page test with every read failing: hero, about, closing render and the page is not the error screen | unit |
| FR-12 · recovery after an outage | DAL tests assert the failed result sets `cacheLife("seconds")` and the success its longer profile (the cache tag and lifetime calls are mocked); spike 1.1 records that a nested short lifetime reaches the page | unit, integration |
| NFR-1 · same page for a signed-in reader | page test: nothing in the page's scope imports or calls cookies, headers or the session; `npm run build` lists `/` as prerendered | unit, integration |
| NFR-2 · narrow viewport | recorded browser scenario at 360, 768 and 1280 px: document width equals the viewport and the cards reflow | end-to-end |
| NFR-3 · images | `HomeHero` and card tests: `priority` and `sizes` props on the hero, a fixed aspect-ratio class on cover boxes | unit |
| NFR-4 · tokens and serif headings | a style test over the home CSS modules: no raw colour values, headings use the display font token; lint stays green | unit |
| NFR-5 · heading outline | page test: one `h1`, each section heading an `h2`, no skipped level; the browser scenario reads the accessibility tree | unit, end-to-end |
| NFR-5 · decorative images | card and hero tests: hero image, covers and author photos have an empty `alt` | unit |
| NFR-5 · card link names | card tests: the link's accessible name contains the title and the author's name | unit |
| FR-8 · admin adds a poem | `addHomePoemAction` test: validation, session, RPC result `added`, `updateTag` and `refresh`; pgTAP: the add function writes the entry at the end; recorded browser scenario for add | unit, integration, end-to-end |
| FR-8 · limit reached | pgTAP: the fifth poem gets `limit-reached`, nothing written; action test: no tag expiry and the message shown by `AddToHomeControl` | integration, unit |
| FR-8 · already chosen | pgTAP: a repeat gets `already-in-list`, nothing written; control test shows the message | integration, unit |
| FR-8 · admin's own poem | route test: the poem route passes `AddToHomeControl` to the page while the moderation controls still follow `may_moderate_author`; control test: shown from `readAdminAccess` only; browser scenario with an admin who has an author profile | unit, end-to-end |
| FR-8 · author page | pgTAP: the author add function; route test: the author route passes the control | integration, unit |
| FR-8 · guest sees no control | `AddToHomeControl` test: nothing for a guest and a non-admin, no extra admin check | unit |
| FR-9 · reorder by dragging | list component test: a drop calls the move action with `from_position` and the new place, a drop at the same place calls nothing; pgTAP: the move function renumbers and clamps; recorded browser scenario with a real drag | unit, integration, end-to-end |
| FR-9 · remove | pgTAP: remove compacts the positions; action test; browser scenario | integration, unit, end-to-end |
| FR-9 · non-admin | `AdminHomePage` test: the same not-found screen as `/admin` for a non-admin and a guest | unit |
| FR-9 · stale drop | pgTAP: a wrong `from_position` answers `stale`, nothing written; list test: the order is restored and the page refreshes | integration, unit |
| FR-9 · keyboard reorder | recorded browser scenario: pick up, move and drop with the keyboard saves the order | end-to-end |
| FR-10 · non-admin cannot write | pgTAP: every `admin_*_home_*` function refuses a non-admin; `admin_functions.test.sql` count and the `unguarded_writers` exemptions updated | integration |
| FR-10 · direct table write refused | pgTAP: select, insert, update and delete on both tables are refused for `anon` and `authenticated` | integration |
| FR-10 · limit under two simultaneous adds | a recorded two-session `psql` run against the local database (task 1.3), the unique and capacity checks are also covered by pgTAP | integration |
| FR-10 · public ids read | pgTAP: `home_featured_ids()` returns only chosen entries of public authors, in position order | integration |
| FR-11 · author deletes a chosen poem | pgTAP: deleting the poem removes its entry and a later add fills the slot | integration |
| FR-11 · admin deletes a chosen poem | pgTAP: `admin_delete_poem` removes the entry through the cascade | integration |
| FR-11 · author's profile is deleted | pgTAP: both the author entry and that author's poem entries are gone | integration |
| FR-11 · author stops being public | pgTAP: the entry stays with `shown = false`; list test: the «не показывается на главной» note and a remove button | integration, unit |
| FR-13 · fresh after add | action test: `updateTag(HOME_FEATURED_TAG)` after `added`, `moved`, `removed`; browser scenario: the next load of `/` shows the new card | unit, end-to-end |
| FR-13 · failed write keeps the cache | action tests: `limit-reached`, `already-in-list`, `not-found` and a failure expire nothing; move `stale` and `not-found` refresh without expiring | unit |
| NFR-6 · boundaries | boundary tests: `home`, `poems`, `authors`, `collections` import no `admin`, `admin` imports no `home`, `home` imports only index paths | unit |
| NFR-6 · quiet failures | RPC wrapper tests: a failed write logs operation and error kind only, never a title, name or id | unit |
| home-greeting FR-6 · greeting shown | `HomeHero` test (the former `HomeGreeting` test moved): heading and message | unit |
| home-greeting FR-6 · greeting drawn in the hero | `HomeHero` test: heading and message in the first section over the image, no search box and no «Очистить» button | unit |
| home-greeting FR-6 · multi-paragraph message | `HomeHero` test with the existing `splitParagraphs` cases | unit |
| home-greeting FR-6 · markup is not interpreted | `HomeHero` test: literal `**Bold** <b>tag</b>`, no bold element | unit |
| home-greeting FR-7 · CMS unavailable | `HomeHero` and page tests with every failure kind: fallback heading and description inside the hero | unit |
| home-greeting FR-10 · no poem search or list | a static search over `src/`, `docs/` and `tests/web-qa-scenarios/` for the banned names (task 6.7), run as a test | unit |
