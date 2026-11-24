| Requirement | Test(s) that close it | Level |
| --- | --- | --- |
| home-banner FR-B1 · banner exists | `home-banner` DAL test (Contentful client mocked): a valid response gives the title, description and image address | unit |
| home-banner FR-B1 · several banners published | DAL test: the query sent orders by `sys_publishedAt_DESC` and takes the first item, so the later-published entry's title is returned | unit |
| home-banner FR-B1 · no banner published | DAL test: an empty collection gives a `not-found` failure | unit |
| home-banner FR-B2 · missing image | DAL test: a banner without an image gives `validation` and no banner | unit |
| home-banner FR-B2 · blank title | DAL test: a whitespace-only title gives `validation` | unit |
| home-banner FR-B2 · image on another host | `isAllowedContentfulImageUrl` test and a DAL test: another host gives `validation`, and the page-level resolver then yields the static hero | unit |
| home-banner FR-B2 · image from another space | `isAllowedContentfulImageUrl` test and a DAL test: the project's host under a different space id gives `validation` | unit |
| home-banner FR-B2 · space id unknown at runtime | DAL test with `CONTENTFUL_SPACE_ID` unset: a `config` failure and no request; `getContentfulSpaceId` test in `shared/lib/contentful/tests` | unit |
| home-banner FR-B2 · pattern and check agree | `shared/config` test: every URL `buildContentfulImagePatterns` allows passes `isAllowedContentfulImageUrl` and every URL it refuses (host, space, `http`, empty space id) fails; `npm run build` with and without the variable | unit, integration |
| home-banner FR-B3 · missing configuration | DAL test: unset `CONTENTFUL_ACCESS_TOKEN` gives a `config` failure, nothing thrown, and the log line holds the kind only (no title, text or URL) | unit |
| home-banner FR-B4 · banner shown | `HomeHero` test: the one `h1` is the title, two paragraphs follow (the first on two lines), the background image source is the banner's address, `alt` empty, `preload` set | unit |
| home-banner FR-B4 · markup is not interpreted | `HomeHero` test: `**Bold** <b>tag</b>` appears literally, no `b` or `strong` element | unit |
| home-banner FR-B5 · CMS unavailable | `resolveBanner` model test for every failure kind (site name, `siteConfig.description`, shipped photo path); `HomeHero` test with the fallback: `h1` "Поэтический Хаб", both buttons' targets `/authors` and `/signup`; recorded browser scenario against the fallback | unit, end-to-end |
| home-banner FR-B6 · centred at narrow and wide widths | style test over `HomeHero.module.css` and the component: `text-align: center` on title and message and centring classes on the content and button wrappers; recorded browser scenario at 360, 768 and 1280 px reading the computed text alignment and the buttons' centre line | unit, end-to-end |
| home-banner FR-B7 · overlay strength | style test: `--hero-scrim` is `rgb(0 0 0 / 0.5)` in the light and dark `:root` blocks and `.scrim` spans the hero box (`inset: 0`) | unit |
| home-banner FR-B7 · overlay sits under the text | style test: `.image` has a lower `z-index` than `.scrim`, and the text wrapper is not under the scrim; no other darkening rule on the photo | unit |
| home-banner NFR-B1 · publish notification makes the next request fresh | DAL test: the banner is read through `contentfulQuery` with no cache options of its own (so the `contentful` tag and 60 s apply); the existing `content-revalidation` route tests cover the tag expiry; `HomeSections` keeps its `contentful` tag (test) | unit |
| home-banner NFR-B1 · Asset-only publish | not tested, by decision (best-effort, spec NFR-B1 and design D9); the docs step records the webhook setting | none |
| home-banner NFR-B2 · contrast against the allowed photo | `feedback-contrast.test.ts` updated: ratio of the on-hero text over the named lightest-photo constant and the 50% overlay is at least 4.5:1 body and 3:1 large in both themes, alpha read from `globals.css` | unit |
| home-banner NFR-B2 · shipped photo respects the rule | image test: the 99th-percentile luminance of `public/home-hero.jpg`'s central band (middle 60% of height, full width) is no lighter than the constant | unit |
| home-greeting FR-5 · home greeting exists | greeting DAL test: the requested key (`about_project_home`) reaches the query variables and the title and message come back | unit |
| home-greeting FR-5 · home greeting missing | greeting DAL test: an empty collection for `call_to_action_signup` gives `not-found` | unit |
| home-greeting FR-5 · old hero key unused | search test (or a unit test over the home sources): no occurrence of `home_greeting` in `src/` | unit |
| home-greeting FR-4 · required field missing | greeting DAL test: a greeting without `title` gives `validation` | unit |
| home-greeting FR-4 · whitespace-only title | greeting DAL test: a `"   "` title gives `validation`; `resolveSectionCopy` test gives the static copy | unit |
| home-greeting FR-4 · unexpected response shape | greeting DAL test: a `data` object without the collection gives `validation` | unit |
| home-greeting FR-3, FR-7 · missing configuration | greeting DAL test: unset token gives `config`, nothing thrown, log line holds the key and kind only | unit |
| home-greeting FR-3, FR-7 · authentication failure | greeting DAL test: HTTP 401 gives `auth`, log line holds neither token nor body | unit |
| home-greeting FR-8 · multi-paragraph message | `HomeAbout` and `HomeJoinCta` tests: two paragraphs, the first on two lines | unit |
| home-greeting FR-8 · markup is not interpreted | `HomeAbout` and `HomeJoinCta` tests: literal `**Bold** <b>tag</b>`, no bold element | unit |
| home-sections FR-1 · hero with the CMS greeting | `HomeHero` test with a resolved banner: one `h1`, description beneath, both buttons' targets; page-level `HomeSections` test with the DAL mocked | unit |
| home-sections FR-1 · hero when the CMS is unavailable | same as home-banner FR-B5 (static `h1`, description, shipped photo, both buttons) | unit, end-to-end |
| home-sections FR-3 · about section | `HomeAbout` test: the CMS title as heading, message beneath, link to `/about` | unit |
| home-sections FR-3 · about section when the CMS is unavailable | `HomeAbout` and `resolveSectionCopy` tests: `ABOUT_COPY` heading and text, link to `/about` | unit |
| home-sections FR-6 · closing section for a guest | `HomeJoinCta` test with the DAL mocked: CMS title and message, button to `/signup`; recorded browser scenario for a guest | unit, end-to-end |
| home-sections FR-6 · closing section when the CMS is unavailable | `HomeJoinCta` test: `JOIN_COPY` heading and text, button to `/signup` | unit |
| home-sections FR-6 · no closing section for a signed-in reader | page test: the DAL mock is not called for a signed-in session and nothing renders; recorded browser scenario for the signed-in admin | unit, end-to-end |
| home-sections FR-6 · no closing section for an admin | same page test with an admin session | unit |
| home-sections · page stays partially prerendered | `npm run build` lists `/` as `◐` (design D6 check, task 3.3) | integration |
| home-sections NFR-1 · cache scope stays session-free | existing `HomeSections` source check stays green; boundary test: `home` imports no `admin` and only index paths of other features | unit |
