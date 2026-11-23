## Why

The home page's hero text comes from one Contentful Greeting entry and its photo is a file shipped with the site; the about and closing sections are fixed constants. The owner wants the editors to change the hero (title, text, photo), the about section and the closing invitation in Contentful without a deploy, and wants the hero text centred over a lightly darkened photo.

## What Changes

- The hero reads its title, text and background photo from the Contentful content type **Home banner** (fields: Title, Description, Banner image). The static site name, static description and the shipped photo stay as the fallback for any failure.
- The about section reads its heading and text from the Greeting entry with key `about_project_home`; the «Подробнее о проекте» link stays in code.
- The closing invitation reads its heading and text from the Greeting entry with key `call_to_action_signup`; the «Присоединиться к проекту» button stays in code.
- Both sections keep today's constant copy as their fallback and stay always shown (the closing one still only for a signed-out visitor).
- The hero's title, text and two buttons are centred horizontally.
- The hero's photo gets a uniform black overlay at 10% opacity (the current scrim is 60%).
- The Greeting entry with key `home_greeting` is no longer read.
- `next/image` is allowed to load from the Contentful image host of the project's space.
- The Contentful publish webhook gains Asset publish and unpublish triggers (a setting plus docs, no code).
- The photo shipped with the site stays as the hero's fallback; it is replaced or darkened only if it is too light for the 10% overlay (a contrast check decides).

Assumptions the owner confirms (Open Questions): the Field IDs `title`, `description` and `bannerImage` and the API ID `homeBanner` (Contentful derives them from the names; the first task checks them); there is one Home banner entry; centring covers the buttons as well as the text; 10% replaces the current 60% scrim in both themes.

## Capabilities

### New Capabilities

- `home-banner`: loading, validating and showing the Home banner from Contentful as the hero's content, with its static fallback, the centred layout and the 10% overlay.

### Modified Capabilities

- `home-greeting`: the Greeting read is by a caller-chosen key for the about and closing sections (the `home_greeting` hero use is removed and moves to `home-banner`).
- `home-sections`: the hero (FR-1), about (FR-3) and closing invitation (FR-6) take their content from Contentful.

## Impact

- Code: `src/features/home/` (a banner DAL, schema and types, a keyed greeting DAL, the hero, about and closing components, the hero CSS module, messages), `src/shared/config/` (a Contentful image-pattern builder), `src/shared/lib/contentful/` (one new public export for the space id), `next.config.ts`, the `--hero-scrim` token in `src/app/globals.css`, the contrast test in `src/shared/ui/tests/`.
- No database change, no new dependency, no new route or env variable (`CONTENTFUL_SPACE_ID` is already required).
- Contentful: the owner must publish one Home banner entry and the two Greeting entries before deploy; until then the page shows the static fallbacks.
- Risk class: touches production configuration (`next.config.ts`) and a contrast guarantee, so it runs the full route.

## Open Questions

- Field IDs, API ID and entry count of Home banner (see assumptions). Owner, due 2026-11-27.
- Is centring meant for the buttons too? Owner, due 2026-11-27.
- Which photo goes into Contentful: with only a 10% overlay, white text needs a dark enough photo (see design, Risks). Owner, due 2026-11-30.

## Mockups

Approved Claude Design canvas (received 2026-11-23): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z

| Screen | Artboard |
| --- | --- |
| Home, hero (centred text and buttons, 10% overlay, short and long text, fallback) | `HomeHero`: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-HomeHero |
| Home, about section (layout unchanged) | `HomeAuthors`: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-HomeAuthors |
| Home, closing invitation (layout unchanged) | `HomeLatest`: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-HomeLatest |
| Whole page and its states | `HomePage`, `HomePageStates`: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-HomePage |
